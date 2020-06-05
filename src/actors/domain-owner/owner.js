const autocannon = require('autocannon');
const chalk = require('chalk');

const CryptoUtil = require('../utils/crypto-util');
const EthereumUtil = require('../utils/ethereum-util');
const HttpUtil = require('../utils/http-util');

const PayloadDB = require('./db/auth-payload-db');
const payloadDB = new PayloadDB();

const {
  ETH_NETWORK_ID,
  ISP_AUTHN_URL
} = require('../config');

const isBenchmarking = () => {
  return (process.env.BENCHMARKING == "true");
};

let RC; // global variable for deployed Registry Contract
const OWNER = CryptoUtil.createNewIdentity();
const GATEWAY = CryptoUtil.createNewIdentity();
let TX_NONCE = 0;

function createAuthenticationPayload() {
  // example of authentication payload for the ISP
  return {
    username: 'john',
    password: 'fish',
    routerIP: '200.100.10.10',
    timestamp: Date.now(),
    nonce: CryptoUtil.randomValueBase64(64)
  };
}

async function prepare() {
  const [assigned, isp, contract] = await Promise.all([
    HttpUtil.assignEther(OWNER.address),
    HttpUtil.getIspInfo(),
    HttpUtil.getContractAbi()
  ]);

  console.log(chalk.yellow(assigned));

  const contractAbi = contract.abi;
  const contractAddress = contract.networks[ETH_NETWORK_ID].address;
  RC = EthereumUtil.constructSmartContract(contractAbi, contractAddress);

  return [isp, contractAddress];
}

function addStoredPayloadEventListener(auth, isp) {
  RC.events.NewPayloadAdded({
    fromBlock: 0
  }, function (error, event) {
    if (error) console.log(chalk.red(error));

    const sender = event.returnValues['sender'];
    const payloadHash = event.returnValues['payloadHash'];
    console.log(chalk.yellow(`Owner ${sender} has stored payload ${payloadHash}`));

    if (sender == OWNER.address) {
      if (payloadDB.isPayloadExist(payloadHash) && !payloadDB.isPayloadVerified(payloadHash)) {
        sendAuthPayloadToIsp(auth, isp);
      }
    }
  });
}

function addGatewayVerifiedEventListener() {
  RC.events.GatewayVerified({
    fromBlock: 0
  }, function (error, event) {
    if (error) console.log(chalk.red(error));

    const sender = event.returnValues['sender'];
    const payloadHash = event.returnValues['payloadHash'];
    const gateway = event.returnValues['gateway'];
    console.log(chalk.yellow(`ISP ${sender} has verified payload ${payloadHash} for gateway ${gateway}`));

    if (payloadDB.isPayloadExist(payloadHash) && !payloadDB.isPayloadVerified(payloadHash)) {
      payloadDB.changePayloadStatusToVerified(payloadHash);
    }
  });
}

async function sendAuthPayloadToIsp(auth, isp) {
  const authSignature = CryptoUtil.signPayload(OWNER.privateKey, auth);
  const payloadForISP = {
    authPayload: auth,
    authSignature: authSignature
  };
  const offChainPayload = await CryptoUtil.encryptPayload(isp.publicKey, payloadForISP);

  if (isBenchmarking()) {
    benchmark(offChainPayload);

  } else {
    const result = await HttpUtil.sendAuthenticationPayloadToIsp(offChainPayload);
    console.log(result);
  }
}

async function sendAuthPayloadToBlockchain(authHash, gatewayAddress, ispAddress, contractAddress) {
  const storeAuth = RC.methods.storeAuthNPayload(authHash, gatewayAddress, ispAddress).encodeABI();
  const storeAuthTx = {
    from: OWNER.address,
    to: contractAddress,
    nonce: TX_NONCE,
    gasLimit: 5000000,
    gasPrice: 5000000000,
    data: storeAuth
  };

  const signedStoreAuthTx = CryptoUtil.signTransaction(OWNER.privateKey, storeAuthTx);
  await EthereumUtil.sendTransaction(signedStoreAuthTx);

  TX_NONCE++;
}

function benchmark(payload) {
  const instance = constructAutoCannonInstance('Owner send many Auth Payload to ISP', ISP_AUTHN_URL, payload);

  autocannon.track(instance, {
    renderProgressBar: true,
    renderResultsTable: false,
    renderLatencyTable: false,
    progressBarString: `Running :percent | Elapsed :elapsed (seconds) | Rate :rate | ETA :eta (seconds)`
  });
  
  instance.on('tick', (counter) => {
    if (counter.counter == 0) {
      console.log(chalk.redBright(`${instance.opts.title} WARN! requests possibly is not being processed`));
    }
  });
  
  instance.on('done', (results) => {
    console.log(chalk.cyan(`${instance.opts.title} Results:`));
    console.log(chalk.cyan(`Avg Tput (Req/sec): ${results.requests.average}`));
    console.log(chalk.cyan(`Avg Lat (ms): ${results.latency.average}`));
  });
  
  // this is used to kill the instance on CTRL-C
  process.on('SIGINT', function() {
    console.log(chalk.bgRed.white('\nGracefully shutting down from SIGINT (Ctrl-C)'));
    instance.stop();
  });
}

function constructAutoCannonInstance(title, url, payload) {
  return autocannon({
    title: title,
    url: url,
    method: 'POST',
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      payload: payload
    }),
    connections: 10,
    pipelining: 1,
    bailout: 1000,
    //overallRate: 10, // rate of requests to make per second from all connections
    amount: 100000,
    duration: 1
  }, console.log);
}

async function main() {
  const prepared = await prepare();

  const isp = prepared[0];
  if (isp == undefined || isp == '') {
    throw new Error('Cannot get ISP info, possibly the ISP has not run yet!');
  }

  const contractAddress = prepared[1];
  if (contractAddress == undefined || contractAddress == '') {
    throw new Error('Cannot get contract address info, possibly the ETH network has not run yet!');
  }

  const auth = createAuthenticationPayload();
  const authHash = CryptoUtil.hashPayload(auth);

  addStoredPayloadEventListener(auth, isp);
  addGatewayVerifiedEventListener();

  payloadDB.insertNewPayload(authHash, GATEWAY.address, isp.address);
  await sendAuthPayloadToBlockchain(authHash, GATEWAY.address, isp.address, contractAddress);
}

main();