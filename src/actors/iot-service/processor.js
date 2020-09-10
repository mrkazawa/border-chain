const chalk = require('chalk');
const log = console.log;

const isBenchmarkingAccess = () => {
  return (process.env.BENCHMARKING_ACCESS == "true");
};

const isBenchmarkingHandshake = () => {
  return (process.env.BENCHMARKING_HANDSHAKE == "true");
};

const isBenchmarkingResource = () => {
  return (process.env.BENCHMARKING_RESOURCE == "true");
};

const CryptoUtil = require('../utils/crypto-util');
const BenchUtil = require('../utils/bench-util');
const Messenger = require('./messenger');
const PayloadDatabase = require('./db/payload-db');

const {
  GATEWAY_AUTHZ_URL,
  GATEWAY_HANDSHAKE_URL,
  GATEWAY_RESOURCE_URL
} = require('./config');

class Processor {
  // TODO: Change isPayloadApproved to isPayloadStored for all updatePayloadStateToStored
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

    if (isBenchmarkingAccess()) Processor.benchmarkAccess(offChainPayload);
    else {
      const result = await Messenger.sendAuthorizationPayloadToGateway(offChainPayload);
      log(chalk.greenBright(result));
    }
  }

  static benchmarkAccess(payload) {
    const title = 'Stress the Gateway Authorization Server';
    const url = GATEWAY_AUTHZ_URL;
    const body = {
      payload: payload
    };
    const connections = BenchUtil.getNumberOfConnections();
    const overallRate = BenchUtil.getOverallRate();
    const amount = BenchUtil.getRequestAmount();

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
    const request = await CryptoUtil.encryptPayload(gateway.publicKey, payloadForGateway);

    if (isBenchmarkingHandshake()) Processor.benchmarkHandshake(request);
    else {
      const response = await Messenger.sendHandshakePayloadToGateway(request);
      const responseDecrypted = await CryptoUtil.decryptPayload(service.privateKey, response);
      const responsePayload = responseDecrypted.payload;
      const responseSignature = responseDecrypted.payloadSignature;

      if (exchange.nonce != responsePayload.nonce) throw new Error('exchange error: invalid nonce from gateway');

      const isValid = CryptoUtil.verifyPayload(responseSignature, responsePayload, gateway.address);
      if (!isValid) throw new Error('exchange error: invalid signature from gateway');

      const secretKey = exchange.secret + responsePayload.secret;
      log('secret key: ', chalk.greenBright(secretKey));

      Processor.requestForResource(payloadHash, exchange.nonce, secretKey);
    }
  }

  static async requestForResource(payloadHash, nonce, secretKey) {
    const request = {
      token: payloadHash,
      deviceAddress: 'deviceAddress',
      type: 'temperature',
      method: 'get'
    };

    const encryptedRequest = CryptoUtil.encryptSymmetrically(secretKey, request);

    const payloadForGateway = {
      nonce: nonce,
      request: encryptedRequest
    };

    if (isBenchmarkingResource()) Processor.benchmarkResource(payloadForGateway);
    else {
      const response = await Messenger.sendResourcePayloadToGateway(payloadForGateway);
      log('response: ', chalk.greenBright(response));
    }
  }

  static benchmarkHandshake(payload) {
    const title = 'Stress the Gateway Handshake Server';
    const url = GATEWAY_HANDSHAKE_URL;
    const body = {
      payload: payload
    };
    const connections = BenchUtil.getNumberOfConnections();
    const overallRate = BenchUtil.getOverallRate();
    const amount = BenchUtil.getRequestAmount();

    const instance = BenchUtil.createPostAutoCannonInstance(title, url, body, connections, overallRate, amount);

    BenchUtil.runBenchmark(instance);
  }

  static benchmarkResource(payload) {
    const title = 'Stress the Gateway Resource Server';
    const url = GATEWAY_RESOURCE_URL;
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