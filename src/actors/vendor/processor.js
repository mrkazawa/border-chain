const chalk = require('chalk');
const log = console.log;

const CryptoUtil = require('../utils/crypto-util');
const DB = require('./db');
const db = new DB();

const {
  DEVICE_AUTHN_OPTION
} = require('./config');

class Processor {
  static async processStoredPayload(payloadHash, sender) {
    try {
      await db.set(payloadHash, sender, 600);
    } catch (err) {
      throw new Error('Error when processing stored payload');
    }
  }

  static async processVerifiedPayload(payloadHash, gateway, device) {
    try {
      await db.del(payloadHash);
      // store list of verified device in a persistent database?
    } catch (err) {
      return new Error('Error when processing verified payload');
    }
  }

  static async processDeviceAuthentication(req, res, contract, vendor, device) {
    if (req.body.constructor === Object && Object.keys(req.body).length === 0) return res.status(401).send('your request does not have a body!');
    const offChainPayload = req.body.payload;

    const payloadForVendor = await CryptoUtil.decryptPayload(vendor.privateKey, offChainPayload);
    const payload = payloadForVendor.payload;
    const payloadSignature = payloadForVendor.payloadSignature;

    const payloadHash = payload.authHash;
    const auth = payload.auth;
    const authOption = payload.authOption;
    const vendorId = payload.vendorId;
    const deviceId = payload.deviceId;

    const sender = await db.get(payloadHash);
    if (sender == undefined) return res.status(404).send('payload not found!');

    const isValid = CryptoUtil.verifyPayload(payloadSignature, payload, sender);
    if (!isValid) return res.status(401).send('invalid signature!');

    if (vendorId != device.vendorId) return res.status(401).send('invalid vendor id!');
    if (deviceId != device.address) return res.status(401).send('invalid device id!');

    const isPayloadValid = await Processor.verifyAuthPayload(authOption, payloadHash, auth, vendor, device);
    if (!isPayloadValid) return res.status(401).send('invalid device authentication payload!');

    try {
      const txNonce = await db.get('txNonce');
      contract.validateAuthPayload(payloadHash, vendor, txNonce);
      await db.incr('txNonce', 1);

      res.status(200).send('authentication attempt successful!');

    } catch (err) {
      log(chalk.red(`internal error: ${err}`));
      return res.status(500).send(`internal error: ${err}`);
    }
  }

  static async verifyAuthPayload(authOption, payloadHash, receivedAuth, vendor, device) {
    switch (authOption) {
      case DEVICE_AUTHN_OPTION.PKE:
        return await Processor.verifyPublicKeyPayload(payloadHash, receivedAuth, vendor, device);

      case DEVICE_AUTHN_OPTION.SKE:
        return Processor.verifySecretKeyPayload(payloadHash, receivedAuth, device);

      case DEVICE_AUTHN_OPTION.FINGERPRINT:
        return Processor.verifyFingerprintPayload(payloadHash, receivedAuth, device);

      case DEVICE_AUTHN_OPTION.MAC:
        return Processor.verifyMacAddressPayload(payloadHash, receivedAuth, device);
    }
  }

  static async verifyPublicKeyPayload(payloadHash, receivedAuth, vendor, device) {
    const decrypted = await CryptoUtil.decryptPayload(vendor.privateKey, receivedAuth);
    const auth = decrypted.auth;
    const authSignature = decrypted.authSignature;

    const hash = CryptoUtil.hashPayload(auth);
    if (payloadHash != hash) return false;

    const isValid = CryptoUtil.verifyPayload(authSignature, auth, device.address);
    if (!isValid) return false;

    return (auth.serialNumber == device.serialNumber);
  }

  static verifySecretKeyPayload(payloadHash, receivedAuth, device) {
    const auth = CryptoUtil.decryptSymmetrically(device.secretKey, receivedAuth);
    const hash = CryptoUtil.hashPayload(auth);
    if (payloadHash != hash) return false;

    return (auth.serialNumber == device.serialNumber);
  }

  static verifyFingerprintPayload(payloadHash, receivedAuth, device) {
    const auth = receivedAuth;
    const hash = CryptoUtil.hashPayload(auth);
    if (payloadHash != hash) return false;

    return (
      auth.fingerprint == CryptoUtil.hashPayload(device.fingerprint) &&
      auth.serialNumber == device.serialNumber
    );
  }

  static verifyMacAddressPayload(payloadHash, receivedAuth, device) {
    const auth = receivedAuth;
    const hash = CryptoUtil.hashPayload(auth);
    if (payloadHash != hash) return false;

    return (
      auth.mac == device.mac &&
      auth.serialNumber == device.serialNumber
    );
  }
}

module.exports = Processor;