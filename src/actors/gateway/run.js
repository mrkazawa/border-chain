const express = require('express');
const bodyParser = require('body-parser');
const chalk = require('chalk');
const log = console.log;

const cluster = require('cluster');
const os = require('os');
const HOSTNAME = os.hostname();
const HTTP_PORT = process.env.HTTP_PORT || 3000;

const Messenger = require('./messenger');
const Processor = require('./processor');
const Contract = require('./contract');

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

    const [contract, gateway, vendor] = await prepare();
    contract.addStoredPayloadEventListener(gateway, vendor);
  }
}

async function prepare() {
  try {
    const [gateway, vendor, abi] = await Promise.all([
      Messenger.getGatewayInfo(),
      Messenger.getVendorInfo(),
      Messenger.getContractAbi()
    ]);

    const assigned = await Messenger.assignEtherToGateway(gateway.address);
    log(chalk.yellow(assigned));

    await Promise.all([
      db.set('gateway', gateway),
      db.set('vendor', vendor),
      db.set('abi', abi),
      db.set('txNonce', 0) // start nonce from 0
    ]);

    const contract = new Contract(abi);
    return [contract, gateway, vendor];

  } catch (err) {
    log(chalk.red(err));
    return new Error('Error when preparing');
  }
}

async function runWorkers() {
  if (cluster.isWorker) {
    const [gateway, vendor, abi] = await Promise.all([
      db.get('gateway'),
      db.get('vendor'),
      db.get('abi')
    ]);

    if (gateway == undefined || vendor == undefined || abi == undefined) throw new Error('Worker cannot get shared parameters');

    const contract = new Contract(abi);

    const app = express();
    app.use(bodyParser.json());

    app.post('/authenticate', async (req, res) => {
      Processor.processDeviceAuthentication(req, res, contract, gateway, vendor);
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