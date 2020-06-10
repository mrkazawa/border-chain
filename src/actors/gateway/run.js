const express = require('express');
const bodyParser = require('body-parser');
const chalk = require('chalk');
const log = console.log;

const cluster = require('cluster');
const os = require('os');
const HOSTNAME = os.hostname();
const HTTP_PORT = process.env.HTTP_PORT || 3000;

const isBenchmarking = () => {
  return (process.env.BENCHMARKING == "true");
};

const CryptoUtil = require('../utils/crypto-util');
const EthereumUtil = require('../utils/ethereum-util');
const HttpUtil = require('../utils/http-util');

const {
  ETH_NETWORK_ID
} = require('../config');

const DB = require('./db');
const db = new DB();

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

    await prepare();
  }
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
      if (!isBenchmarking()) payloadHash = payload.payloadHash;
      else payloadHash = CryptoUtil.hashPayload(Date.now());

      const offChainPayload = payload.offChainPayload;
      const authOption = payload.authOption;
      const vendorId = payload.vendorId;
      const deviceId = payload.deviceId;

      const exist = await db.get(payloadHash);
      if (!isBenchmarking() && exist && exist != undefined) return res.status(401).send('we already process this nonce before!');
      if (vendorId != vendor.id) return res.status(401).send('invalid vendor id!');

      const storedPayload = {
        offChainPayload: offChainPayload,
        authOption: authOption,
        vendorId: vendorId,
        deviceId: deviceId
      }

      db.set(payloadHash, storedPayload, 600);

      try {
        let txNonce = await db.get('txNonce');
        sendAuthPayloadToBlockchain(RC, gateway.address, contractAddress, txNonce, gateway.privateKey, payloadHash, deviceId, vendor.address);
        await db.incr('txNonce', 1, 2592000);

        res.status(200).send('payload received, forwarding to vendor!');

      } catch (err) {
        console.log(`internal error: ${err}`);
        res.status(500).send(`internal error: ${err}`);
      }
    });

    app.listen(HTTP_PORT, () => {
      console.log(`Running ${process.pid}: hit me up on ${HOSTNAME}.local:${HTTP_PORT}`);
    });

    addStoredPayloadEventListener(RC, gateway.address);
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
  if (!isBenchmarking()) EthereumUtil.sendTransaction(signedTx);
}

function sendPayloadToVendor(payloadHash) {
  // get payload option
  console.log('sending to vendor');
}

function addStoredPayloadEventListener(contract, gatewayAddress) {
  contract.events.NewPayloadAdded({
    fromBlock: 0
  }, async function (error, event) {
    if (error) console.log(chalk.red(error));

    const sender = event.returnValues['sender'];
    const payloadHash = event.returnValues['payloadHash'];

    if (sender == gatewayAddress) {
      console.log(chalk.yellow(`This gateway ${sender} has stored payload ${payloadHash} in the blockchain`));

      // FIXME: it is still a race condition between clusters
      // TODO: one solution is to let only the master to send,
      // but it will create bottleneck and impact performance
      const exist = await db.getAndDel(payloadHash);
      if (exist && exist != undefined) {
        sendPayloadToVendor(payloadHash);
      }
    }
  });
}

async function prepare() {
  try {
    const gateway = CryptoUtil.createNewIdentity();

    const [assigned, registered, vendor, contract] = await Promise.all([
      HttpUtil.assignEther(gateway.address),
      HttpUtil.registerGateway(gateway.address, gateway.publicKey),
      HttpUtil.getVendorInfo(),
      HttpUtil.getContractAbi()
    ]);

    log(chalk.yellow(assigned));
    log(chalk.yellow(registered));

    vendor.id = 'samsung';
    const ttl = 2592000; // time-to-live

    await Promise.all([
      db.set('gateway', gateway, ttl),
      db.set('vendor', vendor, ttl),
      db.set('contract', contract, ttl),
      db.set('txNonce', 0, ttl) // start nonce from 0
    ]);

  } catch (err) {
    log(chalk.red(err));
    return new Error('Error when preparing');
  }
}

async function run() {
  await runMaster();
  await runWorkers();
}

run();