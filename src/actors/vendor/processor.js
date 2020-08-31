const chalk = require('chalk');
const log = console.log;

const CryptoUtil = require('../utils/crypto-util');
const PayloadDatabase = require('./db/payload_db');
const SystemDatabase = require('./db/system_db');

const {
  DEVICE_AUTHN_OPTION
} = require('./config');

class Processor {
  static async processPayloadAddedEvent(payloadHash, sender, target, approver) {
    if (await PayloadDatabase.isPayloadApproved(payloadHash)) log(chalk.yellow(`do nothing, we have already processed ${payloadHash} before`));
    else await PayloadDatabase.storeNewPayload(payloadHash, sender, target, approver);
  }

  static async processDeviceApprovedEvent(payloadHash) {
    if (await PayloadDatabase.isPayloadApproved(payloadHash)) log(chalk.yellow(`do nothing, we have already processed ${payloadHash} before`));
    else await PayloadDatabase.updatePayloadStateToApproved(payloadHash);
  }

  static async processDeviceAuthentication(req, res, contract, vendor, device) {
    if (req.body.constructor === Object && Object.keys(req.body).length === 0) return res.status(401).send('your request does not have a body!');

    const offChainPayload = req.body.payload;
    const payloadForVendor = await CryptoUtil.decryptPayload(vendor.privateKey, offChainPayload);

    const payload = payloadForVendor.payload;
    const payloadSignature = payloadForVendor.payloadSignature;

    const authOption = payload.authOption;
    const auth = payload.auth;
    const deviceSignature = payload.deviceSignature;

    let payloadHash;
    if (
      authOption == DEVICE_AUTHN_OPTION.PKSIG ||
      authOption == DEVICE_AUTHN_OPTION.HMAC
    ) payloadHash = CryptoUtil.hashPayload(auth.auth);
    else payloadHash = CryptoUtil.hashPayload(auth);

    const storedPayload = await PayloadDatabase.getPayload(payloadHash);
    if (!storedPayload) return res.status(404).send('payload not found!');

    const sender = storedPayload.sender;
    const target = storedPayload.target;
    const isApproved = storedPayload.isApproved;
    if (isApproved) return res.status(401).send('replay? we already process this before!');

    const isOurDevice = CryptoUtil.verifyPayload(deviceSignature, target, vendor.address);
    if (!isOurDevice) return res.status(401).send('invalid signature: not our device!');

    const isValidGateway = CryptoUtil.verifyPayload(payloadSignature, payload, sender);
    if (!isValidGateway) return res.status(401).send('invalid signature: gateway address is not the same with the one in the blockchain!');

    const isPayloadValid = Processor.verifyDeviceAuthPayload(authOption, auth, target, device);
    if (!isPayloadValid) return res.status(401).send('invalid device authentication payload!');

    const txNonce = await SystemDatabase.getCurrentTxNonce();
    contract.approveDevice(payloadHash, vendor, txNonce);
    await SystemDatabase.incrementTxNonce();

    return res.status(200).send('authentication attempt successful!');
  }

  static verifyDeviceAuthPayload(authOption, receivedAuth, target, device) {
    switch (authOption) {
      case DEVICE_AUTHN_OPTION.PKSIG:
        return Processor.verifyPublicKeyPayload(receivedAuth, target);

      case DEVICE_AUTHN_OPTION.HMAC:
        return Processor.verifySecretKeyPayload(receivedAuth, device);

      case DEVICE_AUTHN_OPTION.FINGERPRINT:
        return Processor.verifyFingerprintPayload(receivedAuth, device);

      case DEVICE_AUTHN_OPTION.MAC:
        return Processor.verifyMacAddressPayload(receivedAuth, device);
    }
  }

  static async verifyPublicKeyPayload(receivedAuth, target) {
    const auth = receivedAuth.auth;
    const authSignature = receivedAuth.authSignature;

    return CryptoUtil.verifyPayload(authSignature, auth, target);
  }

  static verifySecretKeyPayload(receivedAuth, device) {
    const auth = receivedAuth.auth;
    const authSignature = receivedAuth.authSignature;

    return CryptoUtil.verifyDigest(device.secretKey, authSignature, auth);
  }

  static verifyFingerprintPayload(receivedAuth, device) {
    const auth = receivedAuth;

    return (auth.fingerprint == CryptoUtil.hashPayload(device.fingerprint));
  }

  static verifyMacAddressPayload(receivedAuth, device) {
    const auth = receivedAuth;

    return (auth.mac == device.mac);
  }
}

module.exports = Processor;