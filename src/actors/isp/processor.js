const chalk = require('chalk');
const log = console.log;

const CryptoUtil = require('../utils/crypto-util');
const DB = require('./db');
const db = new DB();

class Processor {
  static async processStoredPayload(payloadHash, sender) {
    try {
      await db.set(payloadHash, sender, 600);
    } catch (err) {
      return new Error('Error when processing stored payload');
    }
  }

  static async processVerifiedPayload(payloadHash, gateway) {
    try {
      await db.del(payloadHash);
      // store list of verified gateway in a persistent database?
    } catch (err) {
      return new Error('Error when processing verified payload');
    }
  }

  static async processUserRegistration(req, res, isp) {
    if (req.body.constructor === Object && Object.keys(req.body).length === 0) return res.status(401).send('your request does not have body!');

    // a mock ip address for the owner
    const routerIP = '200.100.10.10';

    const address = req.body.address;
    const content = {
      username: req.body.username,
      password: req.body.password,
      routerIP: routerIP
    };

    try {
      await db.set(address, content);

      const payloadForOwner = {
        address: isp.address,
        publicKey: isp.publicKey,
        routerIP: routerIP
      }

      return res.status(200).send(payloadForOwner);
    } catch (err) {
      log(`internal error: ${err}`);
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

    const sender = await db.get(payloadHash);
    if (sender == undefined) return res.status(404).send('payload not found!');

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
      contract.verifyAuthPayload(payloadHash, payload.routerIP, isp, txNonce);
      await db.incr('txNonce', 1);

      return res.status(200).send('authentication attempt successful!');

    } catch (err) {
      log(chalk.red(`internal error: ${err}`));
      return res.status(500).send(`internal error: ${err}`);
    }
  }
}

module.exports = Processor;