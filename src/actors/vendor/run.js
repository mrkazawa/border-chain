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

const {
  ETH_NETWORK_ID
} = require('../config');

const os = require("os");
const HOSTNAME = os.hostname();
const HTTP_PORT = process.env.HTTP_PORT || 3000;

/**
 * This cache is to store pending authentication payload from IoT gateways
 * that has not been process by this vendor.
 * 
 * This cache will be updated when the vendor receives the 'NewPayloadAdded'
 * events from the smart contract.
 * And this cache will be deleted when the vendor receives the '
 * 
 * This cache is key and value store.
 * The key is (string) payloadHash
 * The value is (string) senderAddress
 * 
 * There is a Time To Live parameter stdTTL in seconds,
 * Therefore the IoT gateways have to sends the off-chain payload to this vendor,quickly after
 * receiving the 'NewPayloadAdded' event
 */
const pendingAuths = new NodeCache({
  stdTTL: 6000,
  checkperiod: 120
});

const isBenchmarking = () => {
  return (process.env.BENCHMARKING == "true");
};

let RC;
let CONTRACT_ADDRESS;
const VENDOR = CryptoUtil.createNewIdentity();
let TX_NONCE = 0;

const app = express();
app.use(bodyParser.json());

app.post('/authenticate', async (req, res) => {
  if(req.body.constructor === Object && Object.keys(req.body).length === 0) return res.status(401).send('your request does not have a body!');
  const offChainPayload = req.body.payload;

  res.status(200).send('authentication attempt successful!');
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

    if (verifier == VENDOR.address) {
      pendingAuths.set(payloadHash, sender);
      console.log(`adding ${payloadHash} to cache`);
    }
  });
}

async function prepare() {
  const [assigned, registered, contract] = await Promise.all([
    HttpUtil.assignEther(VENDOR.address),
    HttpUtil.registerVendor(VENDOR.address, VENDOR.publicKey),
    HttpUtil.getContractAbi()
  ]);

  console.log(chalk.yellow(assigned));
  console.log(chalk.yellow(registered));

  const contractAbi = contract.abi;
  CONTRACT_ADDRESS = contract.networks[ETH_NETWORK_ID].address;
  RC = EthereumUtil.constructSmartContract(contractAbi, CONTRACT_ADDRESS);

  insertMockDevice();
  addStoredPayloadEventListener();
}

function insertMockDevice() {

}

prepare();