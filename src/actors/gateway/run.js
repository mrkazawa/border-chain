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

const PayloadDB = require('./db/auth-payload-db');
const payloadDB = new PayloadDB();

const nonces = new NodeCache({
  stdTTL: 1000,
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

// TODO: we should build a database to store
// the list of vendor id and vendor address
const VENDOR_ID = 'samsung';
let VENDOR;

const GATEWAY = CryptoUtil.createNewIdentity();
let RC;
let CONTRACT_ADDRESS;
let TX_NONCE = 0;

const app = express();
app.use(bodyParser.json());

app.post('/authenticate', async (req, res) => {
  if(req.body.constructor === Object && Object.keys(req.body).length === 0) return res.status(401).send('your request does not have body!');

  const offChainPayload = req.body.offChainPayload;
  const payloadHash = req.body.payloadHash;
  const authOption = req.body.authOption;
  const vendorId = req.body.vendorId;
  const deviceId = req.body.deviceId;

  const exist = nonces.get(payloadHash);
  if (!isBenchmarking() && exist && exist != undefined ) return res.status(401).send('we already process this nonce before!');
  if (vendorId != VENDOR_ID) return res.status(401).send('invalid vendor id!');

  nonces.set(payloadHash);
  payloadDB.insertNewPayload(payloadHash, deviceId, VENDOR.address, authOption, offChainPayload);

  try {
    await sendAuthPayloadToBlockchain(payloadHash, deviceId, VENDOR.address);
    res.status(200).send('payload received, forwarding to vendor!');

  } catch (err) {
    res.status(500).send(`internal error: ${err}`);
  }
});

app.listen(HTTP_PORT, () => {
  console.log(`Hit me up on ${HOSTNAME}.local:${HTTP_PORT}`);
});

async function sendAuthPayloadToBlockchain(authHash, deviceAddress, vendorAddress) {
  const storeAuth = RC.methods.storeAuthNPayload(authHash, deviceAddress, vendorAddress).encodeABI();

  workers.signTransaction(GATEWAY.privateKey, GATEWAY.address, CONTRACT_ADDRESS, TX_NONCE, storeAuth, async function (err, signed) {
    if (err || !signed) throw new Error('Something wrong during signing!');
    if (!isBenchmarking()) await EthereumUtil.sendTransaction(signed);
    TX_NONCE++;
  });
}

function sendPayloadToVendor(payloadHash) {
  // get payload option
}

function addStoredPayloadEventListener() {
  RC.events.NewPayloadAdded({
    fromBlock: 0
  }, function (error, event) {
    if (error) console.log(chalk.red(error));

    const sender = event.returnValues['sender'];
    const payloadHash = event.returnValues['payloadHash'];

    if (sender == GATEWAY.address) {
      console.log(chalk.yellow(`This gateway ${sender} has stored payload ${payloadHash} in the blockchain`));

      if (payloadDB.isPayloadExist(payloadHash) && !payloadDB.isPayloadVerified(payloadHash)) {
        sendPayloadToVendor(payloadHash);
      }
    }
  });
}

async function prepare() {
  const [assigned, registered, vendor, contract] = await Promise.all([
    HttpUtil.assignEther(GATEWAY.address),
    HttpUtil.registerGateway(GATEWAY.address, GATEWAY.publicKey),
    HttpUtil.getVendorInfo(),
    HttpUtil.getContractAbi()
  ]);

  console.log(chalk.yellow(assigned));
  console.log(chalk.yellow(registered));

  VENDOR = vendor;
  
  const contractAbi = contract.abi;
  CONTRACT_ADDRESS = contract.networks[ETH_NETWORK_ID].address;
  RC = EthereumUtil.constructSmartContract(contractAbi, CONTRACT_ADDRESS);

  addStoredPayloadEventListener();
}

prepare();