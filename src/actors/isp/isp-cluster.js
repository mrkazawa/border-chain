var cluster = require('cluster');
var express = require('express');
const bodyParser = require('body-parser');
const chalk = require('chalk');
const NodeCache = require("node-cache");

const os = require('os');
var NUM_CPUS =os.cpus().length;
const HOSTNAME = os.hostname();
const HTTP_PORT = process.env.HTTP_PORT || 5000;

const CryptoUtil = require('../utils/crypto-util');
const EthereumUtil = require('../utils/ethereum-util');
const HttpUtil = require('../utils/http-util');

const UserDB = require('./db/user-db');
const userDB = new UserDB();

const currentPayloadList = new NodeCache({
  stdTTL: 100,
  checkperiod: 120
});

// key is payloadhash, value is senderAddress
const pendingAuthList = new NodeCache({
  stdTTL: 600,
  checkperiod: 120
});

const {
  NETWORK_ID
} = require('../config');

const isBenchmarking = () => {
  return (process.env.BENCHMARKING == "true");
};

// global variable for deployed Registry Contract
let RC;
let CONTRACT_ADDRESS;
const ISP = CryptoUtil.createNewIdentity();
let TX_NONCE = 0;

if (cluster.isMaster) {
  for (var i = 0; i < NUM_CPUS; i++) {
    // Create a worker
    cluster.fork();
  }

} else {
  // Workers share the TCP connection in this server
  const app = express();
  app.use(bodyParser.json());

  app.post('/authenticate', async (req, res) => {
    const offChainPayload = req.body.payload;
  
    const payloadForISP = await CryptoUtil.decryptPayload(ISP.privateKey, offChainPayload);
    const auth = payloadForISP.authPayload;
    const authSignature = payloadForISP.authSignature;
    const authHash = CryptoUtil.hashPayload(auth);

    const sender = pendingAuthList.get(authHash);
    if (sender == undefined) {
      return res.status(404).send('payload not found!');
    }
  
    const isValid = CryptoUtil.verifyPayload(authSignature, auth, sender);
    if (isValid) {
      if (currentPayloadList.get(auth.nonce) == undefined || isBenchmarking()) {
        if (userDB.isUserValid(auth.username, auth.password, auth.routerIP)) {

          currentPayloadList.set(auth.nonce, authHash);
          await sendVerificationToBlockchain(authHash, auth.routerIP);

          res.status(200).send('authentication attempt successful!');
        } else {
          res.status(403).send('invalid authentication payload!');
        }
      } else {
        console.log('you are replaying, we already process this auth payload!');
        res.status(403).send('you are replaying, we already process this auth payload!');
      }
    } else {
      res.status(403).send('invalid signature!');
    }
  });
  
  app.listen(HTTP_PORT, () => {
    console.log(`Hit me up on ${HOSTNAME}.local:${HTTP_PORT}`);
  });
}

cluster.on('exit', function(worker, code, signal) {
  console.log('Worker %d died with code/signal %s. Restarting worker...', worker.process.pid, signal || code);
  cluster.fork();
});

async function sendVerificationToBlockchain(authHash, routerIP) {
  const routerIPInBytes = EthereumUtil.convertStringToByte(routerIP);
  const verifyAuth = RC.methods.verifyAuthNGateway(authHash, routerIPInBytes).encodeABI();
  const verifyAuthTx = {
    from: ISP.address,
    to: CONTRACT_ADDRESS,
    nonce: TX_NONCE,
    gasLimit: 5000000,
    gasPrice: 5000000000,
    data: verifyAuth
  };

  const signedVerifyAuthTx = CryptoUtil.signTransaction(ISP.privateKey, verifyAuthTx);
  if (!isBenchmarking()) await EthereumUtil.sendTransaction(signedVerifyAuthTx);

  TX_NONCE++;
}

function addStoredPayloadEventListener() {
  RC.events.NewPayloadAdded({
    fromBlock: 0
  }, function (error, event) {
    if (error) console.log(chalk.red(error));

    const sender = event.returnValues['sender'];
    const payloadHash = event.returnValues['payloadHash'];
    const verifier = event.returnValues['verifier'];

    if (verifier == ISP.address) {
      pendingAuthList.set(payloadHash, sender);
      console.log(`adding ${payloadHash} to cache`);
    }
  });
}

async function prepare() {
  const [assigned, registered, contract] = await Promise.all([
    HttpUtil.assignEther(ISP.address),
    HttpUtil.registerISP(ISP.address, ISP.publicKey),
    HttpUtil.getContractAbi()
  ]);

  console.log(chalk.yellow(assigned));
  console.log(chalk.yellow(registered));

  const contractAbi = contract.abi;
  CONTRACT_ADDRESS = contract.networks[NETWORK_ID].address;
  RC = EthereumUtil.constructSmartContract(contractAbi, CONTRACT_ADDRESS);

  insertMockUser();
  addStoredPayloadEventListener();
}

function insertMockUser() {
  const mockUser = {
    username: 'john',
    password: 'fish',
    routerIP: '200.100.10.10'
  };

  userDB.insertNewUser(mockUser.username, mockUser.password, mockUser.routerIP);
}

prepare();