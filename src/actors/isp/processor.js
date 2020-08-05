const chalk = require('chalk');
const log = console.log;

const CryptoUtil = require('../utils/crypto-util');
const DB = require('./db');
const db = new DB();

class Processor {
  static async processPayloadAddedEvent(payloadHash, sender) {
    try {
      const storedAuth = {
        sender: sender,
        isApproved: false,
        isRevoked: false
      }
      await db.set(payloadHash, storedAuth);

    } catch (err) {
      throw new Error('error when processing PayloadAdded event!');
    }
  }

  static async processGatewayApprovedEvent(payloadHash, gateway) {
    try {
      let storedAuth = await db.get(payloadHash);
      if (storedAuth == undefined) throw new Error('payload not found!');
      else {
        storedAuth.isApproved = true;
        storedAuth.gateway = gateway;
        await db.replace(payloadHash, storedAuth);
      }

    } catch (err) {
      throw new Error('error when processing GatewayApproved event!');
    }
  }

  static async processDomainOwnerRegistration(req, res, isp) {
    if (req.body.constructor === Object && Object.keys(req.body).length === 0) return res.status(401).send('your request does not have body!');

    // a mock ip address for the owner
    const routerIp = '200.100.10.10';

    const address = req.body.address;
    const user = {
      username: req.body.username,
      password: req.body.password,
      routerIp: routerIp
    };

    try {
      await db.set(address, user);

      const payloadForOwner = {
        address: isp.address,
        publicKey: isp.publicKey,
        routerIp: routerIp
      }

      return res.status(200).send(payloadForOwner);

    } catch (err) {
      log(chalk.redBright(`internal error: ${err}`));
      return res.status(500).send(`internal error: ${err}`);
    }
  }

  static async processGatewayAuthentication(req, res, contract, isp) {
    if (req.body.constructor === Object && Object.keys(req.body).length === 0) return res.status(401).send('your request does not have body!');

    const encryptedPayload = req.body.payload;

    const payloadForIsp = await CryptoUtil.decryptPayload(isp.privateKey, encryptedPayload);
    const payload = payloadForIsp.payload;
    const payloadSignature = payloadForIsp.payloadSignature;
    const payloadHash = CryptoUtil.hashPayload(payload);

    try {
      const storedAuth = await db.get(payloadHash);
      if (storedAuth == undefined) return res.status(404).send('payload not found!');

      const sender = storedAuth.sender;
      const isApproved = storedAuth.isApproved;

      if (isApproved) return res.status(401).send('replay? we already process this before!');

      const isValid = CryptoUtil.verifyPayload(payloadSignature, payload, sender);
      if (!isValid) return res.status(401).send('invalid signature!');

      const user = await db.get(sender);
      if (user == undefined) return res.status(404).send('user not found!');
      if (
        user.username != payload.username ||
        user.password != payload.password ||
        user.routerIp != payload.routerIp
      ) return res.status(401).send('invalid user authentication payload!');


      const txNonce = await db.get('txNonce');
      contract.approveGateway(payloadHash, payload.routerIp, isp, txNonce);
      await db.incr('txNonce', 1);

      return res.status(200).send('authentication attempt successful!');

    } catch (err) {
      log(chalk.redBright(`internal error: ${err}`));
      return res.status(500).send(`internal error: ${err}`);
    }
  }
}

module.exports = Processor;