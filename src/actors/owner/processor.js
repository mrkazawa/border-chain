const chalk = require('chalk');
const log = console.log;

const isBenchmarking = () => {
  return (process.env.BENCHMARKING == "true");
};

const CryptoUtil = require('../utils/crypto-util');
const BenchUtil = require('../utils/bench-util');
const Messenger = require('./messenger');
const DB = require('./db');
const db = new DB();

const {
  ISP_AUTHN_URL
} = require('./config');

class Processor {
  static async processStoredPayload(owner, auth, isp, gatewayAddres) {
    try {
      await db.set(gatewayAddres, true);
      await Processor.prepareAndSendToISP(owner, auth, isp);

    } catch (err) {
      return new Error('Error when processing stored payload');
    }
  }

  static async processVerifiedPayload(gateway) {
    try {
      await db.del(gateway.address);

      // send gateway credentials to gateway?
    } catch (err) {
      return new Error('Error when processing verified payload');
    }
  }

  static async prepareAndSendToISP(owner, auth, isp) {
    const payloadSignature = CryptoUtil.signPayload(owner.privateKey, auth);
    const payloadForISP = {
      payload: auth,
      payloadSignature: payloadSignature
    };
    const offChainPayload = await CryptoUtil.encryptPayload(isp.publicKey, payloadForISP);
  
    if (isBenchmarking()) Processor.benchmark(offChainPayload);
    else {
      const result = await Messenger.sendAuthenticationPayloadToIsp(offChainPayload);
      log(chalk.greenBright(result));
    }
  }

  static benchmark(payload) {
    const title = 'Stress the ISP';
    const url = ISP_AUTHN_URL;
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