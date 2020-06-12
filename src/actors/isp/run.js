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

    const [RC, isp] = await prepare();
    addStoredPayloadEventListener(RC, isp);
  }
}

async function prepare() {
  try {
    const isp = CryptoUtil.createNewIdentity();

    const [assigned, registered, contract] = await Promise.all([
      HttpUtil.assignEther(isp.address),
      HttpUtil.registerIsp(isp.address, isp.publicKey),
      HttpUtil.getContractAbi()
    ]);

    log(chalk.yellow(assigned));
    log(chalk.yellow(registered));

    const user =  {
      username: 'john',
      password: 'fish',
      routerIP: '200.100.10.10'
    };

    await Promise.all([
      db.set('isp', isp, MAX_TTL),
      db.set('contract', contract, MAX_TTL),
      db.set(user.username, user, MAX_TTL),
      db.set('txNonce', 0, MAX_TTL) // start nonce from 0
    ]);

    const contractAbi = contract.abi;
    const contractAddress = contract.networks[ETH_NETWORK_ID].address;
    const RC = EthereumUtil.constructSmartContract(contractAbi, contractAddress);

    return [RC, isp];

  } catch (err) {
    log(chalk.red(err));
    return new Error('Error when preparing');
  }
}

function addStoredPayloadEventListener(contract, isp) {
  contract.events.NewPayloadAdded({
    fromBlock: 0
  }, async function (error, event) {
    if (error) log(chalk.red(error));

    const sender = event.returnValues['sender'];
    const payloadHash = event.returnValues['payloadHash'];
    const verifier = event.returnValues['verifier'];

    if (verifier == isp.address) {
      log(`Adding ${payloadHash} to pending cache`);

      try {
        await db.set(payloadHash, sender, 600);
      } catch (err) {
        log(chalk.red(err));
        throw new Error('Error inserting payloadHash to database');
      }
    }
  });
}

async function runWorkers() {
  if (cluster.isWorker) {
    const [isp, contract] = await Promise.all([
      db.get('isp'),
      db.get('contract')
    ]);

    if (isp == undefined || contract == undefined) throw new Error('Worker cannot get shared parameters');

    const contractAbi = contract.abi;
    const contractAddress = contract.networks[ETH_NETWORK_ID].address;
    const RC = EthereumUtil.constructSmartContract(contractAbi, contractAddress);

    const app = express();
    app.use(bodyParser.json());

    app.post('/authenticate', async (req, res) => {
      if (req.body.constructor === Object && Object.keys(req.body).length === 0) return res.status(401).send('your request does not have body!');
      const payload = req.body.payload;

      const payloadForISP = await CryptoUtil.decryptPayload(isp.privateKey, payload);
      const auth = payloadForISP.authPayload;
      const authSignature = payloadForISP.authSignature;
      const payloadHash = CryptoUtil.hashPayload(auth);

      const sender = await db.get(payloadHash);
      if (sender == undefined) return res.status(404).send('payload not found!');

      const isValid = CryptoUtil.verifyPayload(authSignature, auth, sender);
      if (!isValid) return res.status(401).send('invalid signature!');

      const user = await db.get(auth.username);
      if (user == undefined) return res.status(404).send('user not found!');
      if (user.password != auth.password && user.routerIP != auth.routerIP) return res.status(401).send('invalid user authentication payload!');

      try {
        let txNonce = await db.get('txNonce');
        sendVerificationToBlockchain(RC, isp.address, contractAddress, txNonce, isp.privateKey, payloadHash, auth.routerIP);
        await db.incr('txNonce', 1, MAX_TTL);

        res.status(200).send('authentication attempt successful!');

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

async function sendVerificationToBlockchain(contract, srcAddress, dstAddress, txNonce, privateKey, payloadHash, routerIP) {
  const routerIPInBytes = EthereumUtil.convertStringToByte(routerIP);
  const verifyAuth = contract.methods.verifyAuthNGateway(payloadHash, routerIPInBytes).encodeABI();
  const verifyAuthTx = {
    from: srcAddress,
    to: dstAddress,
    nonce: txNonce,
    gasLimit: 5000000,
    gasPrice: 5000000000,
    data: verifyAuth
  };

  const signedTx = CryptoUtil.signTransaction(privateKey, verifyAuthTx);
  if (!isBenchmarking()) EthereumUtil.sendTransaction(signedTx);
}

async function run() {
  await runMaster();
  await runWorkers();
}

run();