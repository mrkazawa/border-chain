const chalk = require('chalk');
const log = console.log;

const isBenchmarking = () => {
  return (process.env.BENCHMARKING == "true");
};

const CryptoUtil = require('../utils/crypto-util');
const BenchUtil = require('../utils/bench-util');
const Messenger = require('./messenger');
const PayloadDatabase = require('./db/payload_db');

const {
  GATEWAY_AUTHZ_URL
} = require('./config');

class Processor {
  static async processPayloadAddedEvent(payloadHash, service, auth, gateway) {
    if (await PayloadDatabase.isPayloadApproved(payloadHash)) log(chalk.yellow(`do nothing, we have already processed ${payloadHash} before`));
    else {
      await PayloadDatabase.updatePayloadStateToStored(payloadHash);
      await Processor.prepareAndSendToGateway(service, auth, gateway);
    }
  }

  static async prepareAndSendToGateway(service, auth, gateway) {
    const payloadSignature = CryptoUtil.signPayload(service.privateKey, auth);
    const payloadForGateway = {
      payload: auth,
      payloadSignature: payloadSignature
    };
    const offChainPayload = await CryptoUtil.encryptPayload(gateway.publicKey, payloadForGateway);
  
    if (isBenchmarking()) Processor.benchmark(offChainPayload);
    else {
      const result = await Messenger.sendAuthorizationPayloadToGateway(offChainPayload);
      log(chalk.greenBright(result));
    }
  }

  static benchmark(payload) {
    const title = 'Stress the Gateway Authorization Server';
    const url = GATEWAY_AUTHZ_URL;
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