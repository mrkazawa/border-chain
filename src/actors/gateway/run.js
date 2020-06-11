const autocannon = require('autocannon');
const express = require('express');
const bodyParser = require('body-parser');
const chalk = require('chalk');
const log = console.log;

const cluster = require('cluster');
const os = require('os');
const HOSTNAME = os.hostname();
const HTTP_PORT = process.env.HTTP_PORT || 3000;

const isBenchmarkingGateway = () => {
  return (process.env.STRESS_GATEWAY == "true");
};
const isBenchmarkingVendor = () => {
  return (process.env.STRESS_VENDOR == "true");
};

const CryptoUtil = require('../utils/crypto-util');
const EthereumUtil = require('../utils/ethereum-util');
const HttpUtil = require('../utils/http-util');

const {
  ETH_NETWORK_ID,
  VENDOR_AUTHN_URL
} = require('../config');

const DB = require('./db');
const db = new DB();

const MAX_TTL = 2592000; // maximum time-to-live

async function runMaster() {
  if (cluster.isMaster) {
    const numWorkers = os.cpus().length;
    log(`Setting up ${numWorkers} workers...`);

    for (let i = 0; i < numWorkers; i += 1) {
      cluster.fork();
    }

    cluster.on('online', function (worker) {
      log(chalk.green(`Worker ${worker.process.pid} is online`));
    });

    cluster.on('exit', function (worker, code, signal) {
      log(chalk.red(`Worker ${worker.process.pid} died with code: ${code}, and signal: ${signal}`));
      log(`Starting a new worker`);
      cluster.fork();
    });

    const [RC, gateway, vendor] = await prepare();
    addStoredPayloadEventListener(RC, gateway, vendor);
  }
}

async function prepare() {
  try {
    const gateway = CryptoUtil.createNewIdentity();

    const [assigned, registered, vendor, deviceProperties, contract] = await Promise.all([
      HttpUtil.assignEther(gateway.address),
      HttpUtil.registerGateway(gateway.address, gateway.publicKey),
      HttpUtil.getVendorInfo(),
      HttpUtil.getDeviceProperties(),
      HttpUtil.getContractAbi()
    ]);

    log(chalk.yellow(assigned));
    log(chalk.yellow(registered));

    vendor.id = deviceProperties.vendorId;

    await Promise.all([
      db.set('gateway', gateway, MAX_TTL),
      db.set('vendor', vendor, MAX_TTL),
      db.set('contract', contract, MAX_TTL),
      db.set('txNonce', 0, MAX_TTL) // start nonce from 0
    ]);

    const contractAbi = contract.abi;
    const contractAddress = contract.networks[ETH_NETWORK_ID].address;
    const RC = EthereumUtil.constructSmartContract(contractAbi, contractAddress);

    return [RC, gateway, vendor];

  } catch (err) {
    log(chalk.red(err));
    return new Error('Error when preparing');
  }
}

function addStoredPayloadEventListener(contract, gateway, vendor) {
  contract.events.NewPayloadAdded({
    fromBlock: 0
  }, async function (error, event) {
    if (error) log(chalk.red(error));

    const sender = event.returnValues['sender'];
    const payloadHash = event.returnValues['payloadHash'];

    if (sender == gateway.address) {
      log(chalk.yellow(`This gateway ${sender} has stored payload ${payloadHash} in the blockchain`));

      const storedPayload = await db.get(payloadHash);
      if (storedPayload && storedPayload != undefined) {
        sendPayloadToVendor(payloadHash, gateway, vendor, storedPayload);
      }
    }
  });
}

async function sendPayloadToVendor(payloadHash, gateway, vendor, storedPayload) {
  log(`sending to vendor ${payloadHash}`);

  const payloadSignature = CryptoUtil.signPayload(gateway.privateKey, storedPayload);
  const payloadForVendor = {
    payload: storedPayload,
    payloadSignature: payloadSignature
  };
  const offChainPayload = await CryptoUtil.encryptPayload(vendor.publicKey, payloadForVendor);

  if (isBenchmarkingVendor()) {
    benchmark(offChainPayload);

  } else {
    const result = await HttpUtil.sendAuthenticationPayloadToVendor(offChainPayload);
    log(result);
  }
}

function benchmark(payload) {
  const instance = constructAutoCannonInstance('Stress the Vendor Auth Server', VENDOR_AUTHN_URL, payload);

  autocannon.track(instance, {
    renderProgressBar: true,
    renderResultsTable: false,
    renderLatencyTable: false,
    progressBarString: `Running :percent | Elapsed :elapsed (seconds) | Rate :rate | ETA :eta (seconds)`
  });

  instance.on('tick', (counter) => {
    if (counter.counter == 0) {
      log(chalk.redBright(`${instance.opts.title} WARN! requests possibly is not being processed`));
    }
  });

  instance.on('done', (results) => {
    log(chalk.cyan(`${instance.opts.title} Results:`));
    log(chalk.cyan(`Avg Tput (Req/sec): ${results.requests.average}`));
    log(chalk.cyan(`Avg Lat (ms): ${results.latency.average}`));
  });

  // this is used to kill the instance on CTRL-C
  process.on('SIGINT', function () {
    log(chalk.bgRed.white('\nGracefully shutting down from SIGINT (Ctrl-C)'));
    instance.stop();
    process.exit(0);
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
  }, log);
}

async function runWorkers() {
  if (cluster.isWorker) {
    const [gateway, vendor, contract] = await Promise.all([
      db.get('gateway'),
      db.get('vendor'),
      db.get('contract')
    ]);

    if (gateway == undefined || vendor == undefined || contract == undefined) throw new Error('Worker cannot get shared parameters');

    const contractAbi = contract.abi;
    const contractAddress = contract.networks[ETH_NETWORK_ID].address;
    const RC = EthereumUtil.constructSmartContract(contractAbi, contractAddress);

    const app = express();
    app.use(bodyParser.json());

    app.post('/authenticate', async (req, res) => {
      if (req.body.constructor === Object && Object.keys(req.body).length === 0) return res.status(401).send('your request does not have body!');
      const payload = req.body.payload;

      let payloadHash;
      if (!isBenchmarkingGateway()) payloadHash = payload.authHash;
      else payloadHash = CryptoUtil.hashPayload(Date.now());

      const auth = payload.auth;
      const authOption = payload.authOption;
      const vendorId = payload.vendorId;
      const deviceId = payload.deviceId;

      const exist = await db.get(payloadHash);
      if (!isBenchmarkingGateway() && exist && exist != undefined) return res.status(401).send('we already process this hash before!');
      if (vendorId != vendor.id) return res.status(401).send('invalid vendor id!');

      const storedPayload = {
        auth: auth,
        payloadHash: payloadHash,
        authOption: authOption,
        vendorId: vendorId,
        deviceId: deviceId
      }

      db.set(payloadHash, storedPayload, 600);

      try {
        let txNonce = await db.get('txNonce');
        sendAuthPayloadToBlockchain(RC, gateway.address, contractAddress, txNonce, gateway.privateKey, payloadHash, deviceId, vendor.address);
        await db.incr('txNonce', 1, MAX_TTL);

        res.status(200).send('payload received, forwarding to vendor!');

      } catch (err) {
        log(`internal error: ${err}`);
        res.status(500).send(`internal error: ${err}`);
      }
    });

    app.listen(HTTP_PORT, () => {
      log(`Running ${process.pid}: hit me up on ${HOSTNAME}.local:${HTTP_PORT}`);
    });
  }
}

function sendAuthPayloadToBlockchain(contract, srcAddress, dstAddress, txNonce, privateKey, authHash, deviceAddress, vendorAddress) {
  const storeAuth = contract.methods.storeAuthNPayload(authHash, deviceAddress, vendorAddress).encodeABI();
  const storeAuthTx = {
    from: srcAddress,
    to: dstAddress,
    nonce: txNonce,
    gasLimit: 5000000,
    gasPrice: 5000000000,
    data: storeAuth
  };

  const signedTx = CryptoUtil.signTransaction(privateKey, storeAuthTx);
  if (!isBenchmarkingGateway()) EthereumUtil.sendTransaction(signedTx);
}

async function run() {
  await runMaster();
  await runWorkers();
}

run();