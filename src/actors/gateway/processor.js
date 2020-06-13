const chalk = require('chalk');
const log = console.log;

const isBenchmarkingGateway = () => {
  return (process.env.STRESS_GATEWAY == "true");
};
const isBenchmarkingVendor = () => {
  return (process.env.STRESS_VENDOR == "true");
};

const CryptoUtil = require('../utils/crypto-util');
const BenchUtil = require('../utils/bench-util');
const Messenger = require('./messenger');
const DB = require('./db');
const db = new DB();

const {
  VENDOR_AUTHN_URL
} = require('./config');

class Processor {
  static async processStoredPayload(payloadHash, gateway, vendor) {
    const storedPayload = await db.get(payloadHash);
    if (storedPayload && storedPayload != undefined) {
      Processor.prepareAndSendToVendor(gateway, vendor, storedPayload);
    } else {
      log(chalk.red(`Error, cannot find stored payload for ${payloadHash}`));
    }
  }

  static async prepareAndSendToVendor(gateway, vendor, storedPayload) {
    const payloadSignature = CryptoUtil.signPayload(gateway.privateKey, storedPayload);
    const payloadForVendor = {
      payload: storedPayload,
      payloadSignature: payloadSignature
    };
    const offChainPayload = await CryptoUtil.encryptPayload(vendor.publicKey, payloadForVendor);

    if (isBenchmarkingVendor()) Processor.benchmark(offChainPayload);
    else {
      const result = await Messenger.sendAuthenticationPayloadToVendor(offChainPayload);
      log(chalk.greenBright(result));
    }
  }

  static benchmark(payload) {
    const title = 'Stress the Vendor';
    const url = VENDOR_AUTHN_URL;
    const body = {
      payload: payload
    };
    const connections = 500;
    const overallRate = 0;
    const amount = 100000;

    const instance = BenchUtil.createPostAutoCannonInstance(title, url, body, connections, overallRate, amount);

    BenchUtil.runBenchmark(instance);
  }

  static async processDeviceAuthentication(req, res, contract, gateway, vendor) {
    if (req.body.constructor === Object && Object.keys(req.body).length === 0) return res.status(401).send('your request does not have body!');
    const payload = req.body.payload;

    let payloadHash;
    if (!isBenchmarkingGateway()) payloadHash = payload.authHash;
    else payloadHash = CryptoUtil.hashPayload(Date.now());

    const auth = payload.auth;
    const authOption = payload.authOption;
    const vendorId = payload.vendorId;
    const deviceId = payload.deviceId;

    const exist = await db.get(payloadHash);
    if (!isBenchmarkingGateway() && exist && exist != undefined) return res.status(401).send('we already process this hash before!');

    const storedPayload = {
      auth: auth,
      authHash: payloadHash,
      authOption: authOption,
      vendorId: vendorId,
      deviceId: deviceId
    }

    try {
      await db.set(payloadHash, storedPayload, 600);
      const txNonce = await db.get('txNonce');

      contract.storeAuthPayload(payloadHash, deviceId, vendor.address, gateway, txNonce);
      await db.incr('txNonce', 1);

      res.status(200).send('payload received, forwarding to vendor!');

    } catch (err) {
      log(`internal error: ${err}`);
      res.status(500).send(`internal error: ${err}`);
    }
  }
}

module.exports = Processor;