const express = require('express');
const bodyParser = require('body-parser');
const chalk = require('chalk');
const log = console.log;

const cluster = require('cluster');
const os = require('os');
const HOSTNAME = os.hostname();
const HTTP_PORT = process.env.HTTP_PORT || 3000;

const EthereumUtil = require('../utils/ethereum-util');

const Messenger = require('./messenger');
const Processor = require('./processor');
const Contract = require('./contract');
const SystemDatabase = require('./db/system_db');

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

    const [abi, gateway] = await initiateSystemSharedParameters();
    const contract = new Contract(abi);
    contract.addPayloadAddedEventListener(gateway);
    contract.addDeviceApprovedEventListener(gateway);
    contract.addAccessApprovedEventListener(gateway);
  }
}

async function initiateSystemSharedParameters() {
  const [gateway, abi] = await Promise.all([
    Messenger.getGatewayInfo(),
    Messenger.getContractAbi()
  ]);

  const assigned = await Messenger.seedEtherToGateway(gateway.address);
  log(chalk.yellow(assigned));

  const currentTxNonce = await EthereumUtil.getTransactionCount(gateway.address);

  await Promise.all([
    SystemDatabase.initiateGatewayIdentity(gateway),
    SystemDatabase.initiateContractAbi(abi),
    SystemDatabase.initiateTxNonce(currentTxNonce)
  ]);

  return [abi, gateway];
}

async function runWorkers() {
  if (cluster.isWorker) {
    const [gateway, abi] = await getSystemSharedParameters();
    const contract = new Contract(abi);

    const app = express();
    app.use(bodyParser.json());

    app.post('/accesses', async (req, res) => {
      Processor.assignAccess(req, res, gateway);
    });

    app.post('/authenticate', async (req, res) => {
      Processor.processDeviceAuthentication(req, res, contract, gateway);
    });

    app.post('/authorize', async (req, res) => {
      Processor.processServiceAuthorization(req, res, contract, gateway);
    });

    app.listen(HTTP_PORT, () => {
      log(`Running ${process.pid}: hit me up on ${HOSTNAME}.local:${HTTP_PORT}`);
    });
  }
}

async function getSystemSharedParameters() {
  const [gateway, abi] = await Promise.all([
    SystemDatabase.getGatewayIdentity(),
    SystemDatabase.getContractAbi()
  ]);

  if (gateway == undefined || abi == undefined) throw new Error('worker cannot get shared parameters!');

  return [gateway, abi];
}

async function run() {
  await runMaster();
  await runWorkers();
}

run();