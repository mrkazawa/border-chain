const chalk = require('chalk');
const log = console.log;

const isBenchmarkingGateway = () => {
  return (process.env.BENCHMARKING_GATEWAY == "true");
};
const isBenchmarkingHandshake = () => {
  return (process.env.BENCHMARKING_HANDSHAKE == "true");
};
const isBenchmarkingVendor = () => {
  return (process.env.BENCHMARKING_VENDOR == "true");
};

const CryptoUtil = require('../utils/crypto-util');
const BenchUtil = require('../utils/bench-util');
const Messenger = require('./messenger');

const PayloadDatabase = require('./db/payload-db');
const TokenDatabase = require('./db/token-db');
const AccessDatabase = require('./db/access-db');
const NonceDatabase = require('./db/nonce-db');
const SystemDatabase = require('./db/system-db');

const {
  VENDOR_AUTHN_URL
} = require('./config');

class Processor {
  //------------------------- Device Authentication -------------------------//

  static async processAuthenticationPayloadAddedEvent(payloadHash, target, gateway, approver) {
    if (await PayloadDatabase.isPayloadStored(payloadHash)) log(chalk.yellow(`do nothing, we have already stored ${payloadHash} before`));
    else {
      await PayloadDatabase.updatePayloadStateToStored(payloadHash, gateway.address, target, approver);
      await Processor.prepareAndSendToVendor(payloadHash, gateway);
    }
  }

  static async processDeviceApprovedEvent(payloadHash, sender, device) {
    if (await PayloadDatabase.isPayloadApproved(payloadHash)) log(chalk.yellow(`do nothing, we have already processed ${payloadHash} before`));
    else await PayloadDatabase.updatePayloadStateToApproved(payloadHash, sender, device);
  }

  static async prepareAndSendToVendor(payloadHash, gateway) {
    const storedPayload = await PayloadDatabase.getPayload(payloadHash);
    const strippedPayload = {
      authOption: storedPayload.authOption,
      auth: storedPayload.auth,
      deviceSignature: storedPayload.deviceSignature
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
    const connections = BenchUtil.getNumberOfConnections();
    const overallRate = BenchUtil.getOverallRate();
    const amount = BenchUtil.getRequestAmount();

    const instance = BenchUtil.createPostAutoCannonInstance(title, url, body, connections, overallRate, amount);

    BenchUtil.runBenchmark(instance);
  }

  static async processDeviceAuthentication(req, res, contract, gateway) {
    if (req.body.constructor === Object && Object.keys(req.body).length === 0) return res.status(401).send('missing body!');

    const payload = req.body.payload;
    const payloadHash = payload.authHash;
    const auth = payload.auth;
    const authOption = payload.authOption;
    const deviceSignature = payload.deviceSignature;
    const vendorAddress = payload.vendorAddress;
    const vendorPublicKey = payload.vendorPublicKey;
    const deviceAddress = payload.deviceAddress;

    const exist = await PayloadDatabase.doesPayloadExist(payloadHash);
    if (!isBenchmarkingGateway() && exist) return res.status(401).send(`we already processed this hash before!`);

    const isValid = CryptoUtil.verifyPayload(deviceSignature, deviceAddress, vendorAddress);
    if (!isValid) return res.status(401).send('the device signature is invalid!');

    await PayloadDatabase.storeNewPayload(auth, payloadHash, authOption, deviceSignature, vendorAddress, vendorPublicKey, deviceAddress);

    const txNonce = await SystemDatabase.getCurrentTxNonce();
    contract.storePayload(payloadHash, deviceAddress, vendorAddress, gateway, txNonce);
    await SystemDatabase.incrementTxNonce();

    return res.status(200).send('payload received, forwarding to vendor!');
  }

  //------------------------- Access Authorization -------------------------//

  static async processAuthorizationPayloadAddedEvent(payloadHash, sender, target, approver) {
    if (await TokenDatabase.isTokenApproved(payloadHash)) log(chalk.yellow(`do nothing, we have already processed ${payloadHash} before`));
    else await TokenDatabase.storeNewToken(payloadHash, sender, target, approver);
  }

  static async processAccessApprovedEvent(payloadHash, approver, expiryTime) {
    if (await TokenDatabase.isTokenApproved(payloadHash)) log(chalk.yellow(`do nothing, we have already processed ${payloadHash} before`));
    else await TokenDatabase.updateTokenStateToApproved(payloadHash, approver, expiryTime);
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

  static async processAccessAuthorization(req, res, contract, gateway) {
    if (req.body.constructor === Object && Object.keys(req.body).length === 0) return res.status(401).send('your request does not have body!');

    const encryptedPayload = req.body.payload;

    const payloadForGateway = await CryptoUtil.decryptPayload(gateway.privateKey, encryptedPayload);
    const payload = payloadForGateway.payload;
    const payloadSignature = payloadForGateway.payloadSignature;
    const payloadHash = CryptoUtil.hashPayload(payload);

    const storedToken = await TokenDatabase.getTokenObject(payloadHash);
    if (!storedToken) return res.status(404).send('payload not found!');

    // TODO: Change sender to source for all
    const sender = storedToken.sender;
    const isApproved = storedToken.isApproved;
    if (isApproved) return res.status(401).send('replay? we already process this before!');

    const isValid = CryptoUtil.verifyPayload(payloadSignature, payload, sender);
    if (!isValid) return res.status(401).send('invalid signature!');

    const storedAccesses = await AccessDatabase.getAccess(sender);
    if (!storedAccesses) return res.status(404).send('accesses for this address is not found!');

    const accesses = payload.accesses;
    const accessesLength = accesses.length;
    for (let i = 0; i < accessesLength; i++) {
      if (!storedAccesses.includes(accesses[i])) {
        return res.status(401).send('invalid access authorization payload!');
      }
    }
    await TokenDatabase.setAccesses(payloadHash, accesses);

    const txNonce = await SystemDatabase.getCurrentTxNonce();
    const expiredIn = 3600;
    contract.approveAccess(payloadHash, expiredIn, gateway, txNonce);
    await SystemDatabase.incrementTxNonce();

    return res.status(200).send('authorization attempt successful!');
  }

  //------------------------- Accesing Resource -------------------------//

  static async processHandshake(req, res, gateway) {
    if (req.body.constructor === Object && Object.keys(req.body).length === 0) return res.status(401).send('your request does not have body!');

    const encryptedPayload = req.body.payload;

    const payloadForGateway = await CryptoUtil.decryptPayload(gateway.privateKey, encryptedPayload);
    const payload = payloadForGateway.payload;
    const payloadSignature = payloadForGateway.payloadSignature;

    const token = payload.token;
    const nonce = payload.nonce;
    const servicePublicKey = payload.publicKey;

    if (!isBenchmarkingHandshake() && await NonceDatabase.isExist(nonce)) return res.status(401).send('replay? we already process this before!');
    else await NonceDatabase.storeNewNonce(nonce);

    const storedToken = await TokenDatabase.getTokenObject(token);
    const sender = storedToken.sender;
    const isApproved = storedToken.isApproved;
    const isRevoked = storedToken.isRevoked;
    const expiryTime = storedToken.expiryTime;

    if (
      !storedToken ||
      !isApproved ||
      isRevoked ||
      (expiryTime * 1000 < Date.now())
    ) return res.status(401).send('invalid token!');

    const isValid = CryptoUtil.verifyPayload(payloadSignature, payload, sender);
    if (!isValid) return res.status(401).send('invalid signature!');

    const exchange = {
      timestamp: Date.now(),
      nonce: nonce,
      secret: CryptoUtil.randomValueBase64(128)
    };

    const exchangeSignature = CryptoUtil.signPayload(gateway.privateKey, exchange);
    const payloadForService = {
      payload: exchange,
      payloadSignature: exchangeSignature
    };
    const response = await CryptoUtil.encryptPayload(servicePublicKey, payloadForService);

    const secretKey = payload.secret + exchange.secret;
    await NonceDatabase.updateSecret(nonce, secretKey);

    return res.status(200).send(response);
  }

  static async processResource(req, res) {
    if (req.body.constructor === Object && Object.keys(req.body).length === 0) return res.status(401).send('your request does not have body!');

    const retrievedPayload = req.body.payload;
    const nonce = retrievedPayload.nonce;
    const encryptedRequest = retrievedPayload.request;

    const secretKey = await NonceDatabase.getSecret(nonce);
    if (!secretKey) res.status(401).send('invalid nonce!');

    const request = await CryptoUtil.decryptSymmetrically(secretKey, encryptedRequest);
    const token = request.token;
    if (!token) res.status(401).send('invalid request!');

    const storedPayload = await TokenDatabase.getTokenObject(token);
    const isApproved = storedPayload.isApproved;
    const isRevoked = storedPayload.isRevoked;
    const expiryTime = storedPayload.expiryTime;

    if (
      !storedPayload ||
      !isApproved ||
      isRevoked ||
      (expiryTime * 1000 < Date.now())
    ) return res.status(401).send('invalid token!');

    // a mock device temperature response
    const response = {
      deviceAddress: 'deviceAddress',
      temperature: 25
    };
    const encryptedResponse = CryptoUtil.encryptSymmetrically(secretKey, response);

    return res.status(200).send(encryptedResponse);
  }
}

module.exports = Processor;