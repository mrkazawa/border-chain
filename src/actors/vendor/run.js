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
const SystemDatabase = require('./db/system_db');

const {
  DEVICE_PROPERTIES
} = require('./config');

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

    const [abi, vendor] = await initiateSystemSharedParameters();
    const contract = new Contract(abi);
    contract.addPayloadAddedEventListener(vendor);
    contract.addDeviceApprovedEventListener(vendor);
  }
}

async function initiateSystemSharedParameters() {
  const vendor = CryptoUtil.createNewIdentity();
  const device = CryptoUtil.createNewIdentity();

  const deviceSignature = CryptoUtil.signPayload(vendor.privateKey, device.address);
  const deviceProperties = appendToDeviceProperties(DEVICE_PROPERTIES, deviceSignature, device, vendor);

  const [assigned, deviceRegistered, vendorRegistered, abi] = await Promise.all([
    Messenger.seedEtherToVendor(vendor.address),
    Messenger.registerDeviceToAdmin(deviceProperties),
    Messenger.registerVendorToAdmin(vendor),
    Messenger.getContractAbi()
  ]);

  log(chalk.yellow(assigned));
  log(chalk.yellow(deviceRegistered));
  log(chalk.yellow(vendorRegistered));

  let currentTxNonce = await EthereumUtil.getTransactionCount(vendor.address);

  await Promise.all([
    SystemDatabase.storeVendorIdentity(vendor),
    SystemDatabase.storeDeviceIdentity(deviceProperties),
    SystemDatabase.storeContractAbi(abi),
    SystemDatabase.storeTxNonce(currentTxNonce)
  ]);

  return [abi, vendor];
}

function appendToDeviceProperties(deviceProperties, deviceSignature, device, vendor) {
  deviceProperties.deviceSignature = deviceSignature;
  deviceProperties.address = device.address;
  deviceProperties.publicKey = device.publicKey;
  deviceProperties.privateKey = device.privateKey;
  deviceProperties.vendorAddress = vendor.address;
  deviceProperties.vendorPublicKey = vendor.publicKey;

  return deviceProperties;
}

async function runWorkers() {
  if (cluster.isWorker) {
    const [vendor, device, abi] = await getSystemSharedParameters();
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

async function getSystemSharedParameters() {
  const [vendor, device, abi] = await Promise.all([
    SystemDatabase.getVendorIdentity(),
    SystemDatabase.getDeviceIdentity(),
    SystemDatabase.getContractAbi()
  ]);

  if (vendor == undefined || device == undefined || abi == undefined) throw new Error('worker cannot get shared parameters!');

  return [vendor, device, abi];
}

async function run() {
  await runMaster();
  await runWorkers();
}

run();