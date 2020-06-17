const express = require('express');
const bodyParser = require('body-parser');

const EthereumUtil = require('./utils/ethereum-util');

const os = require("os");
const HOSTNAME = os.hostname();
const HTTP_PORT = process.env.HTTP_PORT || 3000;

/**
 * The location of the deployed contract ABI object.
 * This file will be updated every Truffle compile.
 */
const REGISTRY_CONTRACT = require('../build/contracts/RegistryContract.json');

let REGISTERED_VENDOR;
let REGISTERED_GATEWAY;
let REGISTERED_DEVICE;

const app = express();
app.use(bodyParser.json());

// GET contract ABI
app.get('/contract-abi', (req, res) => res.send(REGISTRY_CONTRACT));

// GET address and public key of registered IoT vendor
app.get('/vendor', (req, res) => res.send(REGISTERED_VENDOR));

// GET address and public key of registered IoT gateway
app.get('/gateway', (req, res) => res.send(REGISTERED_GATEWAY));

// GET address and public key of registered IoT device
app.get('/device', (req, res) => res.send(REGISTERED_DEVICE));

// POST add new IoT vendor
app.post('/vendor', (req, res) => {
  const vendor = req.body;

  if (isBodyContainsAddress(vendor) && isBodyContainsPublicKey(vendor)) {
    REGISTERED_VENDOR = vendor;
    res.send(`New IoT vendor ${vendor.address} is registered`);
    
  } else {
    res.status(401).send('Your request must include address and public key');
  }
});

// POST add new IoT gateway
app.post('/gateway', (req, res) => {
  const gateway = req.body;

  if (
    isBodyContainsAddress(gateway) &&
    isBodyContainsPublicKey(gateway) &&
    isBodyContainsPrivateKey(gateway)
  ) {
    REGISTERED_GATEWAY = gateway;
    res.send(`New IoT gateway ${gateway.address} is registered`);
    
  } else {
    res.status(401).send('Your request must include address, public, and private key');
  }
});

// POST add new IoT device
app.post('/device', (req, res) => {
  const device = req.body;

  if (
    isBodyContainsAddress(device) &&
    isBodyContainsPublicKey(device) &&
    isBodyContainsPrivateKey(device)
  ) {
    REGISTERED_DEVICE = device;
    res.send(`New IoT device ${device.address} is registered`);
    
  } else {
    res.status(401).send('Your request must include address, public and private key');
  }
});

// POST add ether to the given account
app.post('/ether', (req, res) => {
  const account = req.body;
  const amount = '100';

  if (isBodyContainsAddress(account)) {
    EthereumUtil.seedEther(account.address, amount);
    res.send(`Congratulations! ${account.address} now has ${amount} Ether`);
    
  } else {
    res.status(401).send('Your request must include address');
  }
});

app.listen(HTTP_PORT, () => {
  console.log(`Hit me up on ${HOSTNAME}.local:${HTTP_PORT}`);
});

function isBodyContainsAddress(jsonBody) {
  return (typeof jsonBody.address !== 'undefined' && jsonBody.address);
}

function isBodyContainsPublicKey(jsonBody) {
  return (typeof jsonBody.publicKey !== 'undefined' && jsonBody.publicKey);
}

function isBodyContainsPrivateKey(jsonBody) {
  return (typeof jsonBody.privateKey !== 'undefined' && jsonBody.privateKey);
}