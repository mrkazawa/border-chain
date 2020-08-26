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
const AuthorizationDatabase = require('./db/authorization_db');
const AccessDatabase = require('./db/access_db');
const SystemDatabase = require('./db/system_db');

const {
  VENDOR_AUTHN_URL
} = require('./config');

class Processor {
  static async processAuthenticationPayloadAddedEvent(payloadHash, target, gateway) {
    if (await PayloadDatabase.isPayloadApproved(payloadHash)) log(chalk.yellow(`do nothing, we have already processed ${payloadHash} before`));
    else {
      await PayloadDatabase.updatePayloadStateToStored(payloadHash, gateway.address, target);
      await Processor.prepareAndSendToVendor(payloadHash, gateway);
    }
  }

  static async processDeviceApprovedEvent(payloadHash, sender, device) {
    if (await PayloadDatabase.isPayloadApproved(payloadHash)) log(chalk.yellow(`do nothing, we have already processed ${payloadHash} before`));
    else await PayloadDatabase.updatePayloadStateToApproved(payloadHash, sender, device);
  }

  static async processAuthorizationPayloadAddedEvent(payloadHash, sender, target, approver) {
    if (await AuthorizationDatabase.isPayloadApproved(payloadHash)) log(chalk.yellow(`do nothing, we have already processed ${payloadHash} before`));
    else await AuthorizationDatabase.storeNewPayload(payloadHash, sender, target, approver);
  }

  static async processAccessApprovedEvent(payloadHash, approver, expiryTime) {
    if (await AuthorizationDatabase.isPayloadApproved(payloadHash)) log(chalk.yellow(`do nothing, we have already processed ${payloadHash} before`));
    else await AuthorizationDatabase.updatePayloadStateToApproved(payloadHash, approver, expiryTime);
  }

  static async prepareAndSendToVendor(payloadHash, gateway) {
    const storedPayload = await PayloadDatabase.getPayload(payloadHash);
    const strippedPayload = {
      authOption: storedPayload.authOption,
      auth: storedPayload.auth,
      signature: storedPayload.signature
    };

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

  static async assignAccess(req, res, gateway) {
    if (req.body.constructor === Object && Object.keys(req.body).length === 0) return res.status(401).send('your request does not have body!');

    const address = req.body.address;
    const accesses = [
      'resource1',
      'resource2',
      'resource3'
    ]; // mock of list of accesses for the given address

    await AccessDatabase.storeNewAccess(address, accesses);

    const accessesSignature = CryptoUtil.signPayload(gateway.privateKey, accesses);
    const responses = {
      accesses: accesses,
      accessesSignature: accessesSignature
    }

    return res.status(200).send(responses);
  }

  static async processServiceAuthorization(req, res, contract, gateway) {
    if (req.body.constructor === Object && Object.keys(req.body).length === 0) return res.status(401).send('your request does not have body!');

    const encryptedPayload = req.body.payload;

    const payloadForGateway = await CryptoUtil.decryptPayload(gateway.privateKey, encryptedPayload);
    const payload = payloadForGateway.payload;
    const payloadSignature = payloadForGateway.payloadSignature;
    const payloadHash = CryptoUtil.hashPayload(payload);

    const storedPayload = await AuthorizationDatabase.getPayload(payloadHash);
    if (!storedPayload) return res.status(404).send('payload not found!');

    const sender = storedPayload.sender;
    const isApproved = storedPayload.isApproved;
    if (isApproved) return res.status(401).send('replay? we already process this before!');

    const isValid = CryptoUtil.verifyPayload(payloadSignature, payload, sender);
    if (!isValid) return res.status(401).send('invalid signature!');

    const storedAccesses = await AccessDatabase.getAccess(sender);
    if (!storedAccesses) return res.status(404).send('accesses for this address is not found!');

    const accesses = payload.accesses;
    const accessesLength = accesses.length;
    for (let i = 0; i < accessesLength; i ++) {
      if (!storedAccesses.includes(accesses[i])) {
        return res.status(401).send('invalid access authorization payload!');
      }
    }
    await AuthorizationDatabase.setAccesses(payloadHash, accesses);

    const txNonce = await SystemDatabase.getCurrentTxNonce();
    const expiredIn = 3600;
    contract.approveAccess(payloadHash, expiredIn, gateway, txNonce);
    await SystemDatabase.incrementTxNonce();

    return res.status(200).send('authorization attempt successful!');
  }
}

module.exports = Processor;