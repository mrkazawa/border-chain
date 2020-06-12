const express = require('express');
const bodyParser = require('body-parser');
const chalk = require('chalk');
const log = console.log;
const workerFarm = require('worker-farm');

const cluster = require('cluster');
const os = require('os');
const HOSTNAME = os.hostname();
const HTTP_PORT = process.env.HTTP_PORT || 3000;

const isBenchmarking = () => {
  return (process.env.BENCHMARKING == "true");
};

const FARM_OPTIONS = {
  maxConcurrentWorkers: os.cpus().length,
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
  ETH_NETWORK_ID,
  DEVICE_AUTHN_OPTION
} = require('../config');

const DB = require('./db');
const db = new DB();

const MAX_TTL = 2592000; // maximum time-to-live

// mock device properties
const VENDOR_ID = 'samsung'; // vendor for device
const DEVICE_SN = '1234-5678-1234-5678'; // device serial number
const SECRET_KEY = 'secret'; // secret key between vendor and device
const FINGERPRINT = 'cf23df2207d99a74fbe169e3eba035e633b65d94'; // example of hash of the secret file
const MAC = '00-14-22-01-23-45'; // example of mac address of device

async function runMaster() {
  if (cluster.isMaster) {
    const numWorkers = os.cpus().length;
    log(`Setting up ${numWorkers} workers...`);

    for (let i = 0; i < numWorkers; i += 1) {
      cluster.fork();
    }

    cluster.on('online', function (worker) {
      log(chalk.green(`Worker ${worker.process.pid} is online`));
    });

    cluster.on('exit', function (worker, code, signal) {
      log(chalk.red(`Worker ${worker.process.pid} died with code: ${code}, and signal: ${signal}`));
      log(`Starting a new worker`);
      cluster.fork();
    });

    const [RC, vendor] = await prepare();
    addStoredPayloadEventListener(RC, vendor.address);
  }
}

async function prepare() {
  try {
    const vendor = CryptoUtil.createNewIdentity();

    const [assigned, registered, device, deviceProperties, contract] = await Promise.all([
      HttpUtil.assignEther(vendor.address),
      HttpUtil.registerVendor(vendor.address, vendor.publicKey),
      HttpUtil.getDeviceInfo(),
      HttpUtil.getDeviceProperties(),
      HttpUtil.getContractAbi()
    ]);

    log(chalk.yellow(assigned));
    log(chalk.yellow(registered));

    await Promise.all([
      db.set('vendor', vendor, MAX_TTL),
      db.set('device', device, MAX_TTL),
      db.set('contract', contract, MAX_TTL),
      db.set('deviceProperties', deviceProperties, MAX_TTL),
      db.set('txNonce', 0, MAX_TTL) // start nonce from 0
    ]);

    const contractAbi = contract.abi;
    const contractAddress = contract.networks[ETH_NETWORK_ID].address;
    const RC = EthereumUtil.constructSmartContract(contractAbi, contractAddress);

    return [RC, vendor];

  } catch (err) {
    log(chalk.red(err));
    return new Error('Error when preparing');
  }
}

function addStoredPayloadEventListener(contract, vendorAddress) {
  contract.events.NewPayloadAdded({
    fromBlock: 0
  }, async function (error, event) {
    if (error) log(chalk.red(error));

    const sender = event.returnValues['sender'];
    const payloadHash = event.returnValues['payloadHash'];
    const verifier = event.returnValues['verifier'];

    if (verifier == vendorAddress) {
      log(`Adding ${payloadHash} to pending cache`);

      try {
        await db.set(payloadHash, sender, 600);
      } catch (err) {
        log(chalk.red(err));
        throw new Error('Error inserting payloadHash to database');
      }
    }
  });
}

async function runWorkers() {
  if (cluster.isWorker) {
    const [vendor, device, contract, deviceProperties] = await Promise.all([
      db.get('vendor'),
      db.get('device'),
      db.get('contract'),
      db.get('deviceProperties')
    ]);

    if (vendor == undefined || contract == undefined || deviceProperties == undefined) throw new Error('Worker cannot get shared parameters');

    const contractAbi = contract.abi;
    const contractAddress = contract.networks[ETH_NETWORK_ID].address;
    const RC = EthereumUtil.constructSmartContract(contractAbi, contractAddress);

    const app = express();
    app.use(bodyParser.json());

    app.post('/register', async (req, res) => {
      if (req.body.constructor === Object && Object.keys(req.body).length === 0) return res.status(401).send('your request does not have body!');

      const serialNumber = req.body.serialNumber;
      const content = {
        address: req.body.address,
        publicKey: req.body.publicKey,
        vendorId: req.body.vendorId,
        secretKey: req.body.secretKey,
        fingerprint: req.body.fingerprint,
        mac: req.body.mac
      };

      try {
        await db.set(serialNumber, content, MAX_TTL);

        return res.status(200).send('device successfully registered!');
      } catch (err) {
        log(`internal error: ${err}`);
        return res.status(500).send(`internal error: ${err}`);
      }
    });

    app.post('/authenticate', async (req, res) => {
      if (req.body.constructor === Object && Object.keys(req.body).length === 0) return res.status(401).send('your request does not have a body!');
      const offChainPayload = req.body.payload;

      const payloadForVendor = await CryptoUtil.decryptPayload(vendor.privateKey, offChainPayload);
      console.log(payloadForVendor);
      const payload = payloadForVendor.payload;
      const payloadSignature = payloadForVendor.payloadSignature;

      const payloadHash = payload.payloadHash;
      const auth = payload.auth;
      const authOption = payload.authOption;
      const vendorId = payload.vendorId;
      const deviceId = payload.deviceId;

      const sender = await db.get(payloadHash);
      if (sender == undefined) return res.status(404).send('payload not found!');

      const isValid = CryptoUtil.verifyPayload(payloadSignature, payload, sender);
      if (!isValid) return res.status(401).send('invalid signature!');

      if (vendorId != deviceProperties.vendorId) return res.status(401).send('invalid vendor id!');
      console.log(deviceId);
      console.log(device.address);

      if (deviceId != device.address) return res.status(401).send('invalid device id!');

      const isPayloadValid = await verifyAuthPayload(authOption, auth, deviceProperties, vendor);
      if (!isPayloadValid) return res.status(401).send('invalid device authentication payload!');

      // verify to blockchain


      res.status(200).send('authentication attempt successful!');
    });

    app.listen(HTTP_PORT, () => {
      log(`Running ${process.pid}: hit me up on ${HOSTNAME}.local:${HTTP_PORT}`);
    });
  }
}

async function verifyAuthPayload(authOption, auth, deviceProperties, vendor) {
  switch (authOption) {
    case DEVICE_AUTHN_OPTION.PKE:
      return await verifyPublicKeyPayload(auth, deviceProperties, vendor);

    case DEVICE_AUTHN_OPTION.SKE:
      return verifySecretKeyPayload(auth, deviceProperties);

    case DEVICE_AUTHN_OPTION.FINGERPRINT:
      return verifyFingerprintPayload(auth, deviceProperties);

    case DEVICE_AUTHN_OPTION.MAC:
      return verifyMacAddressPayload(auth, deviceProperties);
  }
}

async function verifyPublicKeyPayload(auth, deviceProperties, vendor) {
  const decrypted = await CryptoUtil.decryptPayload(vendor.privateKey, auth);
  const isValid = CryptoUtil.verifyPayload(decrypted.authSignature, decrypted.auth);

  //const isValid = CryptoUtil.verifyPayload(auth);
  return (payload.deviceSN == DEVICE_SN);
}

function verifySecretKeyPayload(auth, deviceProperties) {
  const decrypted = CryptoUtil.decryptSymmetrically(deviceProperties.secretKey, auth);
  return (decrypted.serialNumber == deviceProperties.serialNumber);
}

function verifyFingerprintPayload(auth, deviceProperties) {
  return (
    auth.fingerprint == deviceProperties.fingerprint &&
    auth.serialNumber == deviceProperties.serialNumber
  );
}

function verifyMacAddressPayload(auth, deviceProperties) {
  return (
    auth.mac == deviceProperties.mac &&
    auth.serialNumber == deviceProperties.serialNumber
  );
}




async function sendVerificationToBlockchain(authHash, routerIP) {
  const routerIPInBytes = EthereumUtil.convertStringToByte(routerIP);
  const verifyAuth = RC.methods.verifyAuthNGateway(authHash, routerIPInBytes).encodeABI();

  workers.signTransaction(ISP.privateKey, ISP.address, CONTRACT_ADDRESS, TX_NONCE, verifyAuth, async function (err, signed) {
    if (err || !signed) throw new Error('Something wrong during signing!');
    if (!isBenchmarking()) await EthereumUtil.sendTransaction(signed);
    TX_NONCE++;
  });
}

async function run() {
  await runMaster();
  await runWorkers();
}

run();