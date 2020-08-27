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

  static async processAccessApprovedEvent(payloadHash, approver, expiryTime, service, gateway) {
    if (await PayloadDatabase.isPayloadApproved(payloadHash)) log(chalk.yellow(`do nothing, we have already processed ${payloadHash} before`));
    else {
      await PayloadDatabase.updatePayloadStateToApproved(payloadHash, approver, expiryTime);
      await Processor.initiateHandshake(payloadHash, service, gateway);
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

  static async initiateHandshake(payloadHash, service, gateway) {
    const exchange = {
      token: payloadHash,
      publicKey: service.publicKey,
      timestamp: Date.now(),
      nonce: CryptoUtil.randomValueBase64(64),
      secret: CryptoUtil.randomValueBase64(128)
    };

    const exchangeSignature = CryptoUtil.signPayload(service.privateKey, exchange);
    const payloadForGateway = {
      payload: exchange,
      payloadSignature: exchangeSignature
    };
    const offChainPayload = await CryptoUtil.encryptPayload(gateway.publicKey, payloadForGateway);

    const response = await Messenger.sendHandshakePayloadToGateway(offChainPayload);
    const responseDecrypted = await CryptoUtil.decryptPayload(service.privateKey, response);
    const responsePayload = responseDecrypted.payload;
    const responseSignature = responseDecrypted.payloadSignature;

    if (exchange.nonce != responsePayload.nonce) throw new Error('exchange error: invalid nonce from gateway');

    const isValid = CryptoUtil.verifyPayload(responseSignature, responsePayload, gateway.address);
    if (!isValid) throw new Error('exchange error: invalid signature from gateway');

    const secretKey = exchange.secret + responsePayload.secret;
    log(chalk.greenBright(secretKey));
  }
}

module.exports = Processor;