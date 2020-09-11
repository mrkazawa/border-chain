const chalk = require('chalk');
const log = console.log;

const CryptoUtil = require('../utils/crypto-util');
const PayloadDatabase = require('./db/payload-db');
const UserDatabase = require('./db/user-db');
const SystemDatabase = require('./db/system-db');

class Processor {
  static async processPayloadAddedEvent(payloadHash, sender, target, approver) {
    if (await PayloadDatabase.isPayloadApproved(payloadHash)) log(chalk.yellow(`do nothing, we have already processed ${payloadHash} before`));
    else await PayloadDatabase.storeNewPayload(payloadHash, sender, target, approver);
  }

  static async processGatewayApprovedEvent(payloadHash) {
    if (await PayloadDatabase.isPayloadApproved(payloadHash)) log(chalk.yellow(`do nothing, we have already processed ${payloadHash} before`));
    else await PayloadDatabase.updatePayloadStateToApproved(payloadHash);
  }

  static async processDomainOwnerRegistration(req, res, isp) {
    if (req.body.constructor === Object && Object.keys(req.body).length === 0) return res.status(401).send('your request does not have body!');

    const routerIp = '200.100.10.10'; // a mock ip address for the owner
    await UserDatabase.storeNewUser(req.body.address, req.body.username, req.body.password, routerIp);

    const payloadForOwner = {
      address: isp.address,
      publicKey: isp.publicKey,
      routerIp: routerIp
    }

    return res.status(200).send(payloadForOwner);
  }

  static async processGatewayAuthentication(req, res, contract, isp) {
    if (req.body.constructor === Object && Object.keys(req.body).length === 0) return res.status(401).send('your request does not have body!');

    const encryptedPayload = req.body.payload;

    const payloadForIsp = await CryptoUtil.decryptPayload(isp.privateKey, encryptedPayload);
    const payload = payloadForIsp.payload;
    const payloadSignature = payloadForIsp.payloadSignature;
    const payloadHash = CryptoUtil.hashPayload(payload);

    const storedPayload = await PayloadDatabase.getPayload(payloadHash);
    if (!storedPayload) return res.status(404).send('payload not found!');

    const sender = storedPayload.sender;
    const isApproved = storedPayload.isApproved;
    if (isApproved) return res.status(401).send('replay? we already process this before!');

    const isValid = CryptoUtil.verifyPayload(payloadSignature, payload, sender);
    if (!isValid) return res.status(401).send('invalid signature!');

    const user = await UserDatabase.getUser(sender);
    if (!user) return res.status(404).send('user not found!');
    if (
      user.username != payload.username ||
      user.password != payload.password ||
      user.routerIp != payload.routerIp
    ) return res.status(401).send('invalid user authentication payload!');


    const txNonce = await SystemDatabase.getCurrentTxNonce();
    contract.approveGateway(payloadHash, payload.routerIp, isp, txNonce);
    await SystemDatabase.incrementTxNonce();

    return res.status(200).send('authentication attempt successful!');
  }
}

module.exports = Processor;