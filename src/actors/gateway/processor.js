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
const PayloadDatabase = require('./db/payload_db');
const SystemDatabase = require('./db/system_db');

const {
  VENDOR_AUTHN_URL
} = require('./config');

class Processor {
  static async processPayloadAddedEvent(payloadHash, gateway) {
    if (await PayloadDatabase.isPayloadApproved(payloadHash)) log(chalk.yellow(`do nothing, we have already processed ${payloadHash} before`));
    else await Processor.prepareAndSendToVendor(payloadHash, gateway);
  }

  static async processDeviceApprovedEvent(payloadHash, sender, gateway, device) {
    if (await PayloadDatabase.isPayloadApproved(payloadHash)) log(chalk.yellow(`do nothing, we have already processed ${payloadHash} before`));
    else await PayloadDatabase.updatePayloadStateToApproved(payloadHash, sender, gateway, device);
  }

  static async prepareAndSendToVendor(payloadHash, gateway) {
    const storedPayload = await PayloadDatabase.getPayload(payloadHash);
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

    const exist = await PayloadDatabase.doesPayloadExist(payloadHash);
    if (!isBenchmarkingGateway() && exist) return res.status(401).send(`we already processed this hash before!`);

    const isValid = CryptoUtil.verifyPayload(signature, deviceAddress, vendorAddress);
    if (!isValid) return res.status(401).send('the device signature is invalid!');

    await PayloadDatabase.storeNewPayload(auth, payloadHash, authOption, signature, vendorAddress, vendorPublicKey, deviceAddress);

    const txNonce = await SystemDatabase.getCurrentTxNonce();
    contract.storePayload(payloadHash, deviceAddress, vendorAddress, gateway, txNonce);
    await SystemDatabase.incrementTxNonce();

    return res.status(200).send('payload received, forwarding to vendor!');
  }
}

module.exports = Processor;