const chalk = require('chalk');
const log = console.log;

const CryptoUtil = require('../utils/crypto-util');
const DB = require('./db');
const db = new DB();

class Processor {
  static async processNewPayloadAddedEvent(payloadHash, sender) {
    try {
      const storedAuth = {
        sender: sender,
        isVerified: false,
        isRevoked: false
      }
      await db.set(payloadHash, storedAuth);

    } catch (err) {
      throw new Error('error when processing NewPayloadAdded event!');
    }
  }

  static async processGatewayVerifiedEvent(payloadHash, gateway) {
    try {
      let storedAuth = await db.get(payloadHash);
      if (storedAuth == undefined) throw new Error('payload not found!');
      else {
        storedAuth.isVerified = true;
        storedAuth.gateway = gateway;
        await db.replace(payloadHash, storedAuth);
      }

    } catch (err) {
      throw new Error('error when processing GatewayVerified event!');
    }
  }

  static async processUserRegistration(req, res, isp) {
    if (req.body.constructor === Object && Object.keys(req.body).length === 0) return res.status(401).send('your request does not have body!');

    // a mock ip address for the owner
    const routerIP = '200.100.10.10';

    const address = req.body.address;
    const user = {
      username: req.body.username,
      password: req.body.password,
      routerIP: routerIP
    };

    try {
      await db.set(address, user);

      const payloadForOwner = {
        address: isp.address,
        publicKey: isp.publicKey,
        routerIP: routerIP
      }

      return res.status(200).send(payloadForOwner);

    } catch (err) {
      log(chalk.redBright(`internal error: ${err}`));
      return res.status(500).send(`internal error: ${err}`);
    }
  }

  static async processDomainAuthentication(req, res, contract, isp) {
    if (req.body.constructor === Object && Object.keys(req.body).length === 0) return res.status(401).send('your request does not have body!');

    const encryptedPayload = req.body.payload;

    const payloadForISP = await CryptoUtil.decryptPayload(isp.privateKey, encryptedPayload);
    const payload = payloadForISP.payload;
    const payloadSignature = payloadForISP.payloadSignature;
    const payloadHash = CryptoUtil.hashPayload(payload);

    const storedAuth = await db.get(payloadHash);
    if (storedAuth == undefined) return res.status(404).send('payload not found!');

    const sender = storedAuth.sender;
    const isVerified = storedAuth.isVerified;
    
    if (isVerified) return res.status(401).send('replay? we already process this before!');

    const isValid = CryptoUtil.verifyPayload(payloadSignature, payload, sender);
    if (!isValid) return res.status(401).send('invalid signature!');

    const user = await db.get(sender);
    if (user == undefined) return res.status(404).send('user not found!');
    if (
      user.username != payload.username ||
      user.password != payload.password ||
      user.routerIP != payload.routerIP
    ) return res.status(401).send('invalid user authentication payload!');

    try {
      const txNonce = await db.get('txNonce');
      contract.verifyAuthNGateway(payloadHash, payload.routerIP, isp, txNonce);
      await db.incr('txNonce', 1);

      return res.status(200).send('authentication attempt successful!');

    } catch (err) {
      log(chalk.redBright(`internal error: ${err}`));
      return res.status(500).send(`internal error: ${err}`);
    }
  }
}

module.exports = Processor;