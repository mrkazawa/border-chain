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

const DB = require('./db/db');
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

    const [abi, gateway] = await prepare();
    const contract = new Contract(abi);
    contract.addPayloadAddedEventListener(gateway);
    contract.addDeviceApprovedEventListener(gateway);
  }
}

async function prepare() {
  try {
    const [gateway, abi] = await Promise.all([
      Messenger.getGatewayInfo(),
      Messenger.getContractAbi()
    ]);

    const assigned = await Messenger.seedEtherToGateway(gateway.address);
    log(chalk.yellow(assigned));

    const currentTxNonce = await EthereumUtil.getTransactionCount(gateway.address);

    await Promise.all([
      db.set('gateway', gateway),
      db.set('abi', abi),
      db.set('txNonce', currentTxNonce)
    ]);

    return [abi, gateway];

  } catch (err) {
    throw new Error('error when preparing!');
  }
}

async function runWorkers() {
  if (cluster.isWorker) {
    const [gateway, abi] = await Promise.all([
      db.get('gateway'),
      db.get('abi')
    ]);

    if (gateway == undefined || abi == undefined) throw new Error('worker cannot get shared parameters!');

    const contract = new Contract(abi);

    const app = express();
    app.use(bodyParser.json());

    app.post('/authenticate', async (req, res) => {
      Processor.processDeviceAuthentication(req, res, contract, gateway);
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