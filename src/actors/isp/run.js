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

const Processor = require('./processor');
const Messenger = require('./messenger');
const Contract = require('./contract');
const SystemDatabase = require('./db/system-db');

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
      log(`Starting a new worker...`);
      cluster.fork();
    });

    const [abi, isp] = await initiateSystemSharedParameters();

    const contract = new Contract(abi);
    contract.addPayloadAddedEventListener(isp);
    contract.addGatewayApprovedEventListener(isp);
  }
}

async function initiateSystemSharedParameters() {
  const isp = CryptoUtil.createNewIdentity();

  const [assigned, abi, registered] = await Promise.all([
    Messenger.seedEtherToIsp(isp.address),
    Messenger.getContractAbi(),
    Messenger.registerIspToAdmin(isp)
  ]);

  log(chalk.yellow(assigned));
  log(chalk.yellow(registered));

  let currentTxNonce = await EthereumUtil.getTransactionCount(isp.address);

  await Promise.all([
    SystemDatabase.storeIspIdentity(isp),
    SystemDatabase.storeContractAbi(abi),
    SystemDatabase.storeTxNonce(currentTxNonce)
  ]);

  return [abi, isp];
}

async function runWorkers() {
  if (cluster.isWorker) {
    const [isp, abi] = await getSystemSharedParameters();
    const contract = new Contract(abi);

    const app = express();
    app.use(bodyParser.json());

    app.post('/register', async (req, res) => {
      Processor.processDomainOwnerRegistration(req, res, isp);
    });

    app.post('/authenticate', async (req, res) => {
      Processor.processGatewayAuthentication(req, res, contract, isp);
    });

    app.listen(HTTP_PORT, () => {
      log(`Running ${process.pid}: hit me up on ${HOSTNAME}.local:${HTTP_PORT}`);
    });
  }
}

async function getSystemSharedParameters() {
  const [isp, abi] = await Promise.all([
    SystemDatabase.getIspIdentity(),
    SystemDatabase.getContractAbi()
  ]);

  if (isp == undefined || abi == undefined) throw new Error('worker cannot get shared parameters!');

  return [isp, abi];
}

async function run() {
  await runMaster();
  await runWorkers();
}

run();