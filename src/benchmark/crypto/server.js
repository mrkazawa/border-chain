const express = require('express');
const chalk = require('chalk');
const log = console.log;

const cluster = require('cluster');
const os = require('os');
const HOSTNAME = os.hostname();
const HTTP_PORT = process.env.HTTP_PORT || 3000;

const CryptoUtil = require('../../actors/utils/crypto-util');
const IDENTITY = CryptoUtil.createNewIdentity();
const SECRET_KEY = 'cwthZL9lGZ8CAULiEe2tt2LZT67Vav8J5UYkriekUX7blkByMR1k0YgqpwnAWXreBmvpMcpodQhcScJo6DFsFEeOBl161rsFxg2xbGY69ZunXm0kdsunSfiQLyZ7ZM1T';

const MOCK_PAYLOAD = createFakePayload();
const MOCK_SIGNATURE = createFakeSignature(MOCK_PAYLOAD);
const MOCK_DIGEST = createFakeDigest(MOCK_PAYLOAD);
const MOCK_ASYMMETRIC_ENCRYPTED = createFakeAsymmetricEncrypted(MOCK_PAYLOAD);
const MOCK_SYMMETRIC_ENCRYPTED = createFakeSymmeetricEncrypted(MOCK_PAYLOAD);

async function runMaster() {
  if (cluster.isMaster) {
    const numWorkers = os.cpus().length;
    log(`Setting up ${numWorkers} workers...`);

    for (let i = 0; i < numWorkers; i += 1) cluster.fork();

    cluster.on('online', function (worker) {
      log(chalk.green(`Worker ${worker.process.pid} is online`));
    });

    cluster.on('exit', function (worker, code, signal) {
      log(chalk.red(`Worker ${worker.process.pid} died with code: ${code}, and signal: ${signal}`));
      log(`Starting a new worker...`);
      cluster.fork();
    });
  }
}

async function runWorkers() {
  if (cluster.isWorker) {
    const app = express();

    app.get('/hash', async (req, res) => {
      const payloadHash = CryptoUtil.hashPayload(MOCK_PAYLOAD);
      return res.status(200).send(payloadHash);
    });

    app.get('/pk-sign', async (req, res) => {
      const payloadSignature = CryptoUtil.signPayload(IDENTITY.privateKey, MOCK_PAYLOAD);
      return res.status(200).send(payloadSignature);
    });

    app.get('/pk-verify', async (req, res) => {
      const isValid = CryptoUtil.verifyPayload(MOCK_SIGNATURE, MOCK_PAYLOAD, IDENTITY.address);
      return res.status(200).send(isValid);
    });

    app.get('/sk-sign', async (req, res) => {
      const payloadDigest = CryptoUtil.signDigest(SECRET_KEY, MOCK_PAYLOAD);
      return res.status(200).send(payloadDigest);
    });

    app.get('/sk-verify', async (req, res) => {
      const isValid = CryptoUtil.verifyDigest(SECRET_KEY, MOCK_DIGEST, MOCK_PAYLOAD);
      return res.status(200).send(isValid);
    });

    app.get('/pk-encrypt', async (req, res) => {
      const encryptedPayload = await CryptoUtil.encryptPayload(IDENTITY.publicKey, MOCK_PAYLOAD);
      return res.status(200).send(encryptedPayload);
    });

    app.get('/pk-decrypt', async (req, res) => {
      const decryptedPayload = await CryptoUtil.decryptPayload(IDENTITY.privateKey, MOCK_ASYMMETRIC_ENCRYPTED);
      return res.status(200).send(decryptedPayload);
    });

    app.get('/sk-encrypt', async (req, res) => {
      const encryptedPayload = CryptoUtil.encryptSymmetrically(SECRET_KEY, MOCK_PAYLOAD);
      return res.status(200).send(encryptedPayload);
    });

    app.get('/sk-decrypt', async (req, res) => {
      const decryptedPayload = CryptoUtil.decryptSymmetrically(SECRET_KEY, MOCK_SYMMETRIC_ENCRYPTED);
      return res.status(200).send(decryptedPayload);
    });

    app.listen(HTTP_PORT, () => {
      log(`Running ${process.pid}: hit me up on ${HOSTNAME}.local:${HTTP_PORT}`);
    });
  }
}

function createFakePayload() {
  return {
    payload: 'lJ1cNG2XpHzO01sPgev0CI3zxYO6e66elAgMqUXmsyH5H1D6TFktAZW7lTbaAlk4',
    nonce: 'H5WcAuY1VgRj9g52OfjEBnDvonZMpfaVadwHiAujcVRaEQ8kflJGmUIILYGFwQ4JO3MhPJ8QOHuUM0Bi8j5OvDLMbSUhrx4rUoRMlJyrRmQSNJuy2cPqe0wR9LX9aikm',
    timestamp: 1600333111
  };
}

function createFakeSignature(payload) {
  return CryptoUtil.signPayload(IDENTITY.privateKey, payload);
}

function createFakeDigest(payload) {
  return CryptoUtil.signDigest(SECRET_KEY, payload);
}

async function createFakeAsymmetricEncrypted(payload) {
  return await CryptoUtil.encryptPayload(IDENTITY.publicKey, payload);
}

function createFakeSymmeetricEncrypted(payload) {
  return CryptoUtil.encryptSymmetrically(SECRET_KEY, payload);
}

async function run() {
  await runMaster();
  await runWorkers();
}

run();