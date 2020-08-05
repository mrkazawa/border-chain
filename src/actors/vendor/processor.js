const chalk = require('chalk');
const log = console.log;

const CryptoUtil = require('../utils/crypto-util');
const DB = require('./db');
const db = new DB();

const {
  DEVICE_AUTHN_OPTION
} = require('./config');

class Processor {
  static async processPayloadAddedEvent(payloadHash, sender, target) {
    try {
      const storedAuth = {
        sender: sender,
        target: target,
        isApproved: false,
        isRevoked: false
      }
      await db.set(payloadHash, storedAuth);

    } catch (err) {
      throw new Error('error when processing PayloadAdded event!');
    }
  }

  static async processDeviceApprovedEvent(payloadHash) {
    try {
      let storedAuth = await db.get(payloadHash);
      if (storedAuth == undefined) throw new Error('payload not found!');
      else {
        storedAuth.isVerified = true;
        await db.replace(payloadHash, storedAuth);
      }

    } catch (err) {
      return new Error('error when processing DeviceApproved event!');
    }
  }

  static async processDeviceAuthentication(req, res, contract, vendor, device) {
    if (req.body.constructor === Object && Object.keys(req.body).length === 0) return res.status(401).send('your request does not have a body!');

    const offChainPayload = req.body.payload;
    const payloadForVendor = await CryptoUtil.decryptPayload(vendor.privateKey, offChainPayload);

    const payload = payloadForVendor.payload;
    const payloadSignature = payloadForVendor.payloadSignature;

    const authOption = payload.authOption;
    const auth = payload.auth;
    const signature = payload.signature;

    let payloadHash;
    if (
      authOption == DEVICE_AUTHN_OPTION.PKSIG ||
      authOption == DEVICE_AUTHN_OPTION.HMAC
    ) payloadHash = CryptoUtil.hashPayload(auth.auth);
    else payloadHash = CryptoUtil.hashPayload(auth);

    const storedAuth = await db.get(payloadHash);
    if (storedAuth == undefined) return res.status(404).send('payload not found!');

    const sender = storedAuth.sender;
    const target = storedAuth.target;
    const isApproved = storedAuth.isApproved;
    if (isApproved) return res.status(401).send('replay? we already process this before!');

    const isOurDevice = CryptoUtil.verifyPayload(signature, target, vendor.address);
    if (!isOurDevice) return res.status(401).send('invalid signature: not our device!');

    const isValidGateway = CryptoUtil.verifyPayload(payloadSignature, payload, sender);
    if (!isValidGateway) return res.status(401).send('invalid signature: gateway address is not the same with the one in the blockchain!');

    const isPayloadValid = Processor.verifyDeviceAuthPayload(authOption, auth, target, device);
    if (!isPayloadValid) return res.status(401).send('invalid device authentication payload!');

    try {
      const txNonce = await db.get('txNonce');
      contract.approveDevice(payloadHash, vendor, txNonce);
      await db.incr('txNonce', 1);

      res.status(200).send('authentication attempt successful!');

    } catch (err) {
      log(chalk.red(`internal error: ${err}`));
      return res.status(500).send(`internal error: ${err}`);
    }
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