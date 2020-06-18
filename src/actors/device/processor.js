const chalk = require('chalk');
const log = console.log;

const isBenchmarking = () => {
  return (process.env.BENCHMARKING == "true");
};

const CryptoUtil = require('../utils/crypto-util');
const BenchUtil = require('../utils/bench-util');
const Messenger = require('./messenger');

const {
  DEVICE_AUTHN_OPTION,
  GATEWAY_AUTHN_URL
} = require('./config');

class Processor {
  static async preparePayload(option, device) {
    switch (option) {
      case DEVICE_AUTHN_OPTION.PKE:
        return await Processor.constructPublicKeyPayload(device);
  
      case DEVICE_AUTHN_OPTION.SKE:
        return Processor.constructSecretKeyPayload(device);
  
      case DEVICE_AUTHN_OPTION.FINGERPRINT:
        return Processor.constructFingerprintPayload(device);
  
      case DEVICE_AUTHN_OPTION.MAC:
        return Processor.constructMacPayload(device);
    }
  }

  static async constructPublicKeyPayload(device) {
    const auth = {
      serialNumber: device.serialNumber,
      timestamp: Date.now(),
      nonce: CryptoUtil.randomValueBase64(64)
    };
  
    const authSignature = CryptoUtil.signPayload(device.privateKey, auth);
    const authPayload = {
      auth: auth,
      authSignature: authSignature
    }
  
    const authHash = CryptoUtil.hashPayload(auth);
    const encrypted = await CryptoUtil.encryptPayload(device.vendorPublicKey, authPayload);
    
    return [authHash, encrypted];
  }
  
  static constructSecretKeyPayload(device) {
    const auth = {
      serialNumber: device.serialNumber,
      timestamp: Date.now(),
      nonce: CryptoUtil.randomValueBase64(64)
    }
  
    const authHash = CryptoUtil.hashPayload(auth);
    const encrypted = CryptoUtil.encryptSymmetrically(device.secretKey, auth);
  
    return [authHash, encrypted];
  }
  
  static constructFingerprintPayload(device) {
    const auth = {
      serialNumber: device.serialNumber,
      fingerprint: CryptoUtil.hashPayload(device.fingerprint),
      timestamp: Date.now(),
      nonce: CryptoUtil.randomValueBase64(64)
    }
    const authHash = CryptoUtil.hashPayload(auth);
  
    return [authHash, auth];
  }
  
  static constructMacPayload(device) {
    const auth = {
      serialNumber: device.serialNumber,
      mac: device.mac,
      timestamp: Date.now(),
      nonce: CryptoUtil.randomValueBase64(64)
    }
    const authHash = CryptoUtil.hashPayload(auth);
  
    return [authHash, auth];
  }

  static async sendAuthPayloadToGateway(authHash, auth, option, device) {
    const authForGateway = {
      authHash: authHash,
      auth: auth,
      authOption: option,
      signature: device.signature,
      deviceAddress: device.address,
      vendorAddress: device.vendorAddress
    };

    if (isBenchmarking()) Processor.benchmark(authForGateway);
    else {
      const result = await Messenger.sendAuthenticationPayloadToGateway(authForGateway);
      log(chalk.greenBright(result));
    }
  }

  static benchmark(payload) {
    const title = 'Stress the Gateway';
    const url = GATEWAY_AUTHN_URL;
    const body = {
      payload: payload
    };
    const connections = 500;
    const overallRate = 0;
    const amount = 100000;

    const instance = BenchUtil.createPostAutoCannonInstance(title, url, body, connections, overallRate, amount);

    BenchUtil.runBenchmark(instance);
  }
}

module.exports = Processor;