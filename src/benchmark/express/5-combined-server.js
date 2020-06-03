const express = require('express');
const bodyParser = require('body-parser');
const workerFarm = require('worker-farm');

const FARM_OPTIONS = {
  maxConcurrentWorkers: require('os').cpus().length,
  maxCallsPerWorker: Infinity,
  maxConcurrentCallsPerWorker: Infinity
};

const workers = workerFarm(FARM_OPTIONS, require.resolve('../worker'), [
  'signPayload',
  'verifyPayload',
  'encryptPayload',
  'decryptPayload',
  'signTransaction'
]);

const os = require("os");
const HOSTNAME = os.hostname();
const HTTP_PORT = process.env.HTTP_PORT || 5000;

const app = express();
app.use(bodyParser.json());

app.post('/', async function (req, res) {
  const offChainPayload = req.body.payload;
  const privateKey = req.body.privateKey;
  const address = req.body.address;

  workers.decryptPayload(privateKey, offChainPayload, async function (err, decrypted) {
    if (!decrypted) {
      throw res.status(500).send(`error when decrypting: ${err}`);
    }

    const auth = decrypted.authPayload;
    const authSignature = decrypted.authSignature;

    workers.verifyPayload(authSignature, auth, address, function (err, isValid) {
      if (isValid) {
        res.status(200).send('authentication attempt successful!');
      } else {
        res.status(400).send('signature invalid!');
      }
    });
  });
});

app.listen(HTTP_PORT, () => {
  console.log(`Hit me up on ${HOSTNAME}.local:${HTTP_PORT}`);
});