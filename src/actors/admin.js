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

let REGISTERED_GATEWAY;
let REGISTERED_DEVICE;

const isps = new Map();
const vendors = new Map();

const app = express();
app.use(bodyParser.json());

// GET contract ABI
app.get('/contract-abi', (req, res) => res.send(REGISTRY_CONTRACT));

// GET seed ether to the given account
app.get('/seed-ether', (req, res) => {
  if (!req.query.address) return res.status(401).send('missing address!');

  const amount = '100';
  const accountAddress = req.query.address;

  try {
    EthereumUtil.seedEther(accountAddress, amount);

    return res.status(200).send(`Congratulations! ${accountAddress} now has ${amount} Ether`);
  } catch (err) {
    return res.status(500).send(err.message);
  }
});

// GET address and public key of registered IoT gateway
app.get('/gateway', (req, res) => res.send(REGISTERED_GATEWAY));

// GET address and public key of registered IoT device
app.get('/device', (req, res) => res.send(REGISTERED_DEVICE));

// GET info of the registered ISP
app.get('/isp', (req, res) => {
  if (!req.query.address) return res.status(401).send('your request must contain address information!');

  const ispAddress = req.query.address;
  if (!isps.has(ispAddress)) return res.status(404).send('isp with given address not found!');

  const isp = isps.get(ispAddress);

  return res.status(200).send(isp);
});

// GET info of the registered vendor
app.get('/vendor', (req, res) => {
  if (!req.query.address) return res.status(401).send('your request must contain address information!');

  const vendorAddress = req.query.address;
  if (!vendors.has(vendorAddress)) return res.status(404).send('vendor with given address not found!');

  const vendor = vendors.get(vendorAddress);
  
  return res.status(200).send(vendor);
});

//----------------------------- POST -----------------------------//

// POST add new IoT gateway
app.post('/gateway', (req, res) => {
  if (req.body.constructor === Object && Object.keys(req.body).length === 0) return res.status(401).send('missing body!');

  const gateway = req.body;
  REGISTERED_GATEWAY = gateway;

  res.send(`New IoT gateway ${gateway.address} is registered`);
});

// POST add new IoT device
app.post('/device', (req, res) => {
  if (req.body.constructor === Object && Object.keys(req.body).length === 0) return res.status(401).send('missing body!');

  const device = req.body;
  REGISTERED_DEVICE = device;

  res.send(`New IoT device ${device.address} is registered`);
});

// POST add new ISP
app.post('/isp', (req, res) => {
  if (req.body.constructor === Object && Object.keys(req.body).length === 0) return res.status(401).send('missing body!');

  const isp = req.body;
  if (!isp.address) return res.status(401).send('missing address!');

  isps.set(isp.address, isp);

  return res.status(200).send(`New ISP ${isp.address} is registered`);
});

// POST add new vendor
app.post('/vendor', (req, res) => {
  if (req.body.constructor === Object && Object.keys(req.body).length === 0) return res.status(401).send('missing body!');

  const vendor = req.body;
  if (!vendor.address) return res.status(401).send('missing address!');

  vendors.set(vendor.address, vendor);

  return res.status(200).send(`New vendor ${vendor.address} is registered`);
});

app.listen(HTTP_PORT, () => {
  console.log(`Hit me up on ${HOSTNAME}.local:${HTTP_PORT}`);
});