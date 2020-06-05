const express = require('express');
const bodyParser = require('body-parser');
const chalk = require('chalk');
const NodeCache = require("node-cache");
const workerFarm = require('worker-farm');

const FARM_OPTIONS = {
  maxConcurrentWorkers: require('os').cpus().length,
  maxCallsPerWorker: Infinity,
  maxConcurrentCallsPerWorker: Infinity
};

const workers = workerFarm(FARM_OPTIONS, require.resolve('../worker'), [
  'signPayload',
  'verifyPayload',
  'encryptPayload',
  'decryptPayload',
  'signTransaction'
]);

const CryptoUtil = require('../utils/crypto-util');
const EthereumUtil = require('../utils/ethereum-util');
const HttpUtil = require('../utils/http-util');

const UserDB = require('./db/user-db');
const userDB = new UserDB();

const currentPayloadList = new NodeCache({
  stdTTL: 1000,
  checkperiod: 120
});

// key is payloadhash, value is senderAddress
const pendingAuthList = new NodeCache({
  stdTTL: 6000,
  checkperiod: 120
});

const {
  ETH_NETWORK_ID
} = require('../config');

const os = require("os");
const HOSTNAME = os.hostname();
const HTTP_PORT = process.env.HTTP_PORT || 3000;

const isBenchmarking = () => {
  return (process.env.BENCHMARKING == "true");
};

// global variable for deployed Registry Contract
let RC;
let CONTRACT_ADDRESS;
const ISP = CryptoUtil.createNewIdentity();
let TX_NONCE = 0;

const app = express();
app.use(bodyParser.json());

app.post('/authenticate', async (req, res) => {
  const offChainPayload = req.body.payload;

  workers.decryptPayload(ISP.privateKey, offChainPayload, async function (err, decrypted) {
    if (err || !decrypted) throw new Error('Something wrong during decryption!');

    const payloadForISP = decrypted;
    const auth = payloadForISP.authPayload;
    const authSignature = payloadForISP.authSignature;
    const authHash = CryptoUtil.hashPayload(auth);

    const sender = pendingAuthList.get(authHash);
    if (sender == undefined) {
      return res.status(404).send('payload not found!');
    }

    workers.verifyPayload(authSignature, auth, sender, async function (err, isValid) {
      if (err) throw new Error('Something wrong during verification!');

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
          res.status(403).send('you are replaying, we already process this auth payload!');
        }
      } else {
        res.status(403).send('invalid signature!');
      }
    });
  });
});

app.listen(HTTP_PORT, () => {
  console.log(`Hit me up on ${HOSTNAME}.local:${HTTP_PORT}`);
});

async function sendVerificationToBlockchain(authHash, routerIP) {
  const routerIPInBytes = EthereumUtil.convertStringToByte(routerIP);
  const verifyAuth = RC.methods.verifyAuthNGateway(authHash, routerIPInBytes).encodeABI();

  workers.signTransaction(ISP.privateKey, ISP.address, CONTRACT_ADDRESS, TX_NONCE, verifyAuth, async function (err, signed) {
    if (err || !signed) throw new Error('Something wrong during signing!');
    if (!isBenchmarking()) await EthereumUtil.sendTransaction(signed);
    TX_NONCE++;
  });
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
  CONTRACT_ADDRESS = contract.networks[ETH_NETWORK_ID].address;
  RC = EthereumUtil.constructSmartContract(contractAbi, CONTRACT_ADDRESS);

  insertMockUser();
  addStoredPayloadEventListener();
}

function insertMockUser() {
  /**
   * our mock of users data stored in the ISP
   * in real life, this data is collected by ISP during users
   * registration and then stored in database.
   */
  const mockUser = {
    username: 'john',
    password: 'fish',
    routerIP: '200.100.10.10'
  };

  userDB.insertNewUser(mockUser.username, mockUser.password, mockUser.routerIP);
}

prepare();