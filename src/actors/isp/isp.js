const express = require('express');
const chalk = require('chalk');
const NodeCache = require("node-cache");

const CryptoUtil = require('../utils/crypto-util');
const EthereumUtil = require('../utils/ethereum-util');
const HttpUtil = require('../utils/http-util');

const UserDB = require('./db/user-db');
const userDB = new UserDB();

const currentPayloadList = new NodeCache({
  stdTTL: 100,
  checkperiod: 120
});

const os = require("os");
const HOSTNAME = os.hostname();
const HTTP_PORT = process.env.HTTP_PORT || 3000;

const {
  NETWORK_ID
} = require('../utils/config');

// global variable for deployed Registry Contract
let RC;
let contractAddress;
const ISP = CryptoUtil.createNewIdentity();
let TX_NONCE = 0;

const app = express();
app.use(express.json());

app.post('/authenticate', async (req, res) => {
  const offChainPayload = req.body.payload;

  const payloadForISP = await CryptoUtil.decryptPayload(ISP.privateKey, offChainPayload);
  const auth = payloadForISP.authPayload;
  const authSignature = payloadForISP.authSignature;
  const authHash = CryptoUtil.hashPayload(auth);

  const payload = await RC.methods.getPayloadDetail(authHash).call();
  const source = payload[0];
  const verifier = payload[2];
  const isValue = payload[3];
  const isVerified = payload[4];

  if (verifier == ISP.address && isValue && !isVerified) {

    const isValid = CryptoUtil.verifyPayload(authSignature, auth, source);
    if (isValid) {
      if (currentPayloadList.get(auth.nonce) == undefined) {
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
  } else {
    res.status(404).send('payload not found in blockchain!');
  }
});

app.listen(HTTP_PORT, () => {
  console.log(`Hit me up on ${HOSTNAME}.local:${HTTP_PORT}`);
});

async function sendVerificationToBlockchain(authHash, routerIP) {
  const routerIPInBytes = EthereumUtil.convertStringToByte(routerIP);
  const verifyAuth = RC.methods.verifyAuthNGateway(authHash, routerIPInBytes).encodeABI();
  const verifyAuthTx = {
    from: ISP.address,
    to: contractAddress,
    nonce: TX_NONCE,
    gasLimit: 5000000,
    gasPrice: 5000000000,
    data: verifyAuth
  };

  const signedVerifyAuthTx = CryptoUtil.signTransaction(ISP.privateKey, verifyAuthTx);
  await EthereumUtil.sendTransaction(signedVerifyAuthTx);

  TX_NONCE++;
}

async function prepare() {
  const [assigned, registered, contract] = await Promise.all([
    HttpUtil.assignEther(ISP.address),
    HttpUtil.registerISP(ISP.address, ISP.publicKey),
    HttpUtil.getContractAbi()
  ]);

  console.log(chalk.yellow(assigned));
  console.log(chalk.yellow(registered));

  insertMockUser();

  const contractAbi = contract.abi;
  contractAddress = contract.networks[NETWORK_ID].address;
  RC = EthereumUtil.constructSmartContract(contractAbi, contractAddress);
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