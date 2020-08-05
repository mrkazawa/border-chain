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
  static async processPayloadAddedEvent(payloadHash, owner, auth, isp) {
    try {
      const storedAuth = await db.get(payloadHash);
      if (!storedAuth || !storedAuth.isApproved) await Processor.prepareAndSendToIsp(owner, auth, isp);
      else log(chalk.yellow(`do nothing, we has already processed ${payloadHash} before`));

    } catch (err) {
      return new Error('error when processing PayloadAdded event!');
    }
  }

  static async processGatewayApprovedEvent(payloadHash, gateway) {
    try {
      // store list of approved gateway address in the database
      // this is useful for revocation use case
      const storedAuth = {
        gateway: gateway.address,
        isApproved: true,
        isRevoked: false
      }
      await db.set(payloadHash, storedAuth);

      const registered = await Messenger.registerGatewayToAdmin(gateway.address, gateway.publicKey, gateway.privateKey);
      log(chalk.yellow(registered));

    } catch (err) {
      return new Error('error when processing GatewayApproved event!');
    }
  }

  static async prepareAndSendToIsp(owner, auth, isp) {
    const payloadSignature = CryptoUtil.signPayload(owner.privateKey, auth);
    const payloadForIsp = {
      payload: auth,
      payloadSignature: payloadSignature
    };
    const offChainPayload = await CryptoUtil.encryptPayload(isp.publicKey, payloadForIsp);
  
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