const chalk = require('chalk');

const CryptoUtil = require('../utils/crypto-util');
const EthereumUtil = require('../utils/ethereum-util');
const HttpUtil = require('../utils/http-util');

const PayloadDB = require('./db/auth-payload-db');
const payloadDB = new PayloadDB();

const {
  NETWORK_ID
} = require('../utils/config');

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
  const contractAddress = contract.networks[NETWORK_ID].address;
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
      if (!payloadDB.isPayloadVerified(payloadHash)) {
        sendAuthenticationToIsp(auth, isp);
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

async function sendAuthenticationToIsp(auth, isp) {
  const authSignature = CryptoUtil.signPayload(OWNER.privateKey, auth);
  const payloadForISP = {
    authPayload: auth,
    authSignature: authSignature
  };
  const offChainPayload = await CryptoUtil.encryptPayload(isp.publicKey, payloadForISP);
  const result = await HttpUtil.sendAuthPayloadToIsp(offChainPayload);
  console.log(result);
}

async function main() {
  const prepared = await prepare();
  const isp = prepared[0];
  const contractAddress = prepared[1];

  const auth = createAuthenticationPayload();
  const authHash = CryptoUtil.hashPayload(auth);

  addStoredPayloadEventListener(auth, isp);
  addGatewayVerifiedEventListener();

  payloadDB.insertNewPayload(authHash, GATEWAY.address, isp.address);

  const storeAuth =  RC.methods.storeAuthNPayload(authHash, GATEWAY.address, isp.address).encodeABI();
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

  TX_NONCE ++;
}

main();