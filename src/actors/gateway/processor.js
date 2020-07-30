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
  static async processNewPayloadAddedEvent(payloadHash, gateway) {
    const storedPayload = await db.get(payloadHash);
    if (!storedPayload) log(chalk.red(`do nothing, ${payloadHash} not found`));
    else if (storedPayload.isVerified) log(chalk.red(`do nothing, ${payloadHash} already verified`));
    else Processor.prepareAndSendToVendor(gateway, storedPayload);
  }

  static async prepareAndSendToVendor(gateway, storedPayload) {
    const strippedPayload = {
      authOption: storedPayload.authOption,
      auth: storedPayload.auth,
      signature: storedPayload.signature
    }

    const payloadSignature = CryptoUtil.signPayload(gateway.privateKey, strippedPayload);
    const payloadForVendor = {
      payload: strippedPayload,
      payloadSignature: payloadSignature
    };
    const offChainPayload = await CryptoUtil.encryptPayload(storedPayload.vendorPublicKey, payloadForVendor);

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

  static async processDeviceAuthentication(req, res, contract, gateway) {
    if (req.body.constructor === Object && Object.keys(req.body).length === 0) return res.status(401).send('missing body!');

    const payload = req.body.payload;
    const payloadHash = payload.authHash;
    const auth = payload.auth;
    const authOption = payload.authOption;
    const signature = payload.signature;
    const vendorAddress = payload.vendorAddress;
    const vendorPublicKey = payload.vendorPublicKey;
    const deviceAddress = payload.deviceAddress;

    const exist = await db.get(payloadHash);
    if (!isBenchmarkingGateway() && exist) return res.status(401).send('we already process this hash before!');

    const isValid = CryptoUtil.verifyPayload(signature, deviceAddress, vendorAddress);
    if (!isValid) return res.status(401).send('the device signature is invalid!');

    const storedPayload = {
      auth: auth,
      authHash: payloadHash,
      authOption: authOption,
      signature: signature,
      vendorAddress: vendorAddress,
      vendorPublicKey: vendorPublicKey,
      deviceAddress: deviceAddress,
      isVerified: false,
      isRevoked: false
    }

    try {
      await db.set(payloadHash, storedPayload);
      const txNonce = await db.get('txNonce');
      contract.storeAuthNPayload(payloadHash, deviceAddress, vendorAddress, gateway, txNonce);
      await db.incr('txNonce', 1);

      res.status(200).send('payload received, forwarding to vendor!');

    } catch (err) {
      log(`internal error: ${err}`);
      res.status(500).send(`internal error: ${err}`);
    }
  }
}

module.exports = Processor;