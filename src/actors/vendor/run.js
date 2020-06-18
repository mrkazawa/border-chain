const express = require('express');
const bodyParser = require('body-parser');
const chalk = require('chalk');
const log = console.log;

const cluster = require('cluster');
const os = require('os');
const HOSTNAME = os.hostname();
const HTTP_PORT = process.env.HTTP_PORT || 3000;

const CryptoUtil = require('../utils/crypto-util');
const EthereumUtil = require('../utils/ethereum-util');

const Messenger = require('./messenger');
const Processor = require('./processor');
const Contract = require('./contract');

const {
  DEVICE_PROPERTIES
} = require('./config');

const DB = require('./db');
const db = new DB();

async function runMaster() {
  if (cluster.isMaster) {
    const numWorkers = os.cpus().length;
    log(`Setting up ${numWorkers} workers...`);

    for (let i = 0; i < numWorkers; i += 1) cluster.fork();

    cluster.on('online', function (worker) {
      log(chalk.green(`Worker ${worker.process.pid} is online`));
    });

    cluster.on('exit', function (worker, code, signal) {
      log(chalk.red(`Worker ${worker.process.pid} died with code: ${code}, and signal: ${signal}`));
      log(`Starting a new worker`);
      cluster.fork();
    });

    const [contract, vendor] = await prepare();
    contract.addStoredPayloadEventListener(vendor);
    contract.addDeviceVerifiedEventListener(vendor);
  }
}

async function prepare() {
  try {
    const vendor = CryptoUtil.createNewIdentity();
    const device = CryptoUtil.createNewIdentity();
    const signature = CryptoUtil.signPayload(vendor.privateKey, device.address);
    const deviceProperties = appendToDeviceProperties(DEVICE_PROPERTIES, signature, device, vendor);

    const [assigned, registeres, abi] = await Promise.all([
      Messenger.assignEtherToVendor(vendor.address),
      Messenger.registerDeviceToAdmin(deviceProperties),
      Messenger.getContractAbi()
    ]);

    log(chalk.yellow(assigned));
    log(chalk.yellow(registeres));

    let currentTxNonce = await EthereumUtil.getTransactionCount(vendor.address);

    await Promise.all([
      db.set('vendor', vendor),
      db.set('device', deviceProperties),
      db.set('abi', abi),
      db.set('txNonce', currentTxNonce)
    ]);

    const contract = new Contract(abi);
    return [contract, vendor];

  } catch (err) {
    log(chalk.red(err));
    return new Error('Error when preparing');
  }
}

function appendToDeviceProperties(deviceProperties, signature, device, vendor) {
  deviceProperties.signature = signature;
  deviceProperties.address = device.address;
  deviceProperties.publicKey = device.publicKey;
  deviceProperties.privateKey = device.privateKey;
  deviceProperties.vendorAddress = vendor.address;
  deviceProperties.vendorPublicKey = vendor.publicKey;

  return deviceProperties;
}

async function runWorkers() {
  if (cluster.isWorker) {
    const [vendor, device, abi] = await Promise.all([
      db.get('vendor'),
      db.get('device'),
      db.get('abi')
    ]);

    if (vendor == undefined || device == undefined || abi == undefined) throw new Error('Worker cannot get shared parameters');

    const contract = new Contract(abi);

    const app = express();
    app.use(bodyParser.json());

    app.post('/authenticate', async (req, res) => {
      Processor.processDeviceAuthentication(req, res, contract, vendor, device);
    });

    app.listen(HTTP_PORT, () => {
      log(`Running ${process.pid}: hit me up on ${HOSTNAME}.local:${HTTP_PORT}`);
    });
  }
}

async function run() {
  await runMaster();
  await runWorkers();
}

run();