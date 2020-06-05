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

let registeredIsp;
let registeredVendor;
let registeredGateway;

const app = express();
app.use(bodyParser.json());

// GET contract ABI
app.get('/contract-abi', (req, res) => res.send(REGISTRY_CONTRACT));

// GET address and public key of registered ISP
app.get('/isp', (req, res) => res.send(registeredIsp));

// GET address and public key of registered IoT vendor
app.get('/vendor', (req, res) => res.send(registeredVendor));

// GET address and public key of registered IoT gateway
app.get('/gateway', (req, res) => res.send(registeredGateway));

// POST add new ISP
app.post('/isp', (req, res) => {
  const isp = req.body;

  if (
    (typeof isp.address !== 'undefined' && isp.address) &&
    (typeof isp.publicKey !== 'undefined' && isp.publicKey)
  ) {
    registeredIsp = isp;
    res.send(`New ISP ${isp.address} is registered`);
    
  } else {
    res.status(401).send('Your request must include address and public key');
  }
});

// POST add new IoT vendor
app.post('/vendor', (req, res) => {
  const vendor = req.body;

  if (
    (typeof vendor.address !== 'undefined' && vendor.address) &&
    (typeof vendor.publicKey !== 'undefined' && vendor.publicKey)
  ) {
    registeredVendor = vendor;
    res.send(`New IoT vendor ${vendor.address} is registered`);
    
  } else {
    res.status(401).send('Your request must include address and public key');
  }
});

// POST add new IoT gateway
app.post('/gateway', (req, res) => {
  const gateway = req.body;

  if (
    (typeof gateway.address !== 'undefined' && gateway.address) &&
    (typeof gateway.publicKey !== 'undefined' && gateway.publicKey)
  ) {
    registeredGateway = gateway;
    res.send(`New IoT gateway ${gateway.address} is registered`);
    
  } else {
    res.status(401).send('Your request must include address and public key');
  }
});

// POST add ether to the given account
app.post('/ether', (req, res) => {
  const account = req.body;
  const amount = '100';

  if (typeof account.address !== 'undefined' && account.address) {
    EthereumUtil.seedEther(account.address, amount);

    res.send(`Congratulations! ${account.address} now has ${amount} Ether`);
    
  } else {
    res.status(401).send('Your request must include address');
  }
});

app.listen(HTTP_PORT, () => {
  console.log(`Hit me up on ${HOSTNAME}.local:${HTTP_PORT}`);
});