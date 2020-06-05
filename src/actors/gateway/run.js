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
const VENDOR = CryptoUtil.createNewIdentity();

// global variable for deployed Registry Contract
let RC;
let CONTRACT_ADDRESS;
const ISP = CryptoUtil.createNewIdentity();
let TX_NONCE = 0;


/**
 * our mock of vendor ID to eth address mapping.
 * the gateway maintains this mapping in production.
 */
const vendorMapping = {
  'samsung': {
    'address': tools.getVendorAddress()
  },
  'lg': {
    'address': '0x0000abc'
  }
};

// setup parameters that are known by the gateway.
const gatewayPrivateKey = tools.getGatewayPrivateKey();
const gatewayAddress = tools.getGatewayAddress();
// creating RegistryContract from deployed contract at the given address
const RC = tools.constructSmartContract(tools.getContractABI(), tools.getContractAddress());

const app = express();
app.use(bodyParser.json());

app.post('/authenticate', async (req, res) => {
  const offChainPayload = req.body.offChainPayload;
  const payloadHash = req.body.payloadHash;
  const authOption = req.body.authOption;
  const vendorId = req.body.vendorId;
  const deviceId = req.body.deviceId;
  const nonce = req.body.nonce;

  const exist = nonces.get(payloadHash);
  if (!isBenchmarking() && exist && exist != undefined ) return res.status(401).send('we already process this nonce before!');
  nonces.set(payloadHash);

  if (vendorId != VENDOR_ID) return res.status(401).send('invalid vendor id!');


  // TODO: check the nonce
  if (typeof vendorMapping[vendorID] !== 'undefined') {
    let vendorAddress = vendorMapping[vendorID].address;

    // sending transaction to register payload to the smart contract
    let tx = await RC.methods.storeAuthNPayload(authPayloadHash, deviceID, vendorAddress).send({
      from: gatewayAddress,
      gas: 1000000
    });
    if (typeof tx.events.NewPayloadAdded !== 'undefined') {
      const event = tx.events.NewPayloadAdded;
      console.log('Tx stored in the block!');
      console.log('Storing Authn Tx from: ', event.returnValues['sender']);
      console.log('Authn payload: ', event.returnValues['payloadHash']);

      // sending authentication payload to the vendor
      let options = {
        method: 'POST',
        uri: tools.getVendorAuthnEndpoint(),
        body: {
          offChainPayload
        },
        resolveWithFullResponse: true,
        json: true // Automatically stringifies the body to JSON
      };
      rp(options).then(function (response) {
        console.log('Response status code: ', response.statusCode)
        console.log('Response body: ', response.body);
        if (response.statusCode == '200') {
          res.status(200).send('authentication attempt successful');
        } else {
          res.status(403).send(response.body);
        }
      }).catch(function (err) {
        console.log(err);
        res.status(500).send(err);
      });
    } else {
      res.status(500).send('cannot store auth payload Tx to blockchain!');
    }
  } else {
    res.status(404).send('vendor ID is not found!');
  }
});

// main
app.listen(5000, () =>
  console.log('Gateway Server is listening on port 5000!'),
);