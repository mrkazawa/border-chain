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

const verifiedIsps = [];
const verifiedVendor = [];

const app = express();
app.use(bodyParser.json());

// GET contract ABI
app.get('/contract-abi', (req, res) => res.send(REGISTRY_CONTRACT));

// GET list of verified ISPs
app.get('/isp', (req, res) => res.send(verifiedIsps));

// GET list of verified IoT vendors
app.get('/vendor', (req, res) => res.send(verifiedVendor));

// POST add new ISP
app.post('/isp', (req, res) => {
  const isp = req.body;

  if (
    (typeof isp.address !== 'undefined' && isp.address) &&
    (typeof isp.publicKey !== 'undefined' && isp.publicKey)
  ) {
    verifiedIsps.push(isp);
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
    verifiedVendor.push(vendor);
    res.send(`New IoT vendor ${vendor.address} is registered`);
    
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