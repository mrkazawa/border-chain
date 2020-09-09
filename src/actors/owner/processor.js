const chalk = require('chalk');
const log = console.log;

const isBenchmarking = () => {
  return (process.env.BENCHMARKING == "true");
};

const CryptoUtil = require('../utils/crypto-util');
const BenchUtil = require('../utils/bench-util');
const Messenger = require('./messenger');
const PayloadDatabase = require('./db/payload-db');
const SystemDatabase = require('./db/system-db');

const {
  ISP_AUTHN_URL
} = require('./config');

class Processor {
  static async processPayloadAddedEvent(payloadHash, owner, auth, isp) {
    if (await PayloadDatabase.isPayloadApproved(payloadHash)) log(chalk.yellow(`do nothing, we have already processed ${payloadHash} before`));
    else {
      await PayloadDatabase.updatePayloadStateToStored(payloadHash);
      await Processor.prepareAndSendToIsp(owner, auth, isp);
    }
  }

  static async processGatewayApprovedEvent(payloadHash, approver, gateway) {
    if (await PayloadDatabase.isPayloadApproved(payloadHash)) log(chalk.yellow(`do nothing, we have already processed ${payloadHash} before`));
    else {
      await PayloadDatabase.updatePayloadStateToApproved(payloadHash, approver);
      await SystemDatabase.storeGatewayIdentity(gateway);

      const registered = await Messenger.registerGatewayToAdmin(gateway.address, gateway.publicKey, gateway.privateKey);
      log(chalk.yellow(registered));
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
    const connections = BenchUtil.getNumberOfConnections();
    const overallRate = BenchUtil.getOverallRate();
    const amount = BenchUtil.getRequestAmount();

    const instance = BenchUtil.createPostAutoCannonInstance(title, url, body, connections, overallRate, amount);

    BenchUtil.runBenchmark(instance);
  }
}

module.exports = Processor;