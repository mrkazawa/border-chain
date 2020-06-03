var cluster = require('cluster');
var express = require('express');
var numCPUs = require('os').cpus().length;

const bodyParser = require('body-parser');

const os = require("os");
const HOSTNAME = os.hostname();
const HTTP_PORT = process.env.HTTP_PORT || 5000;

const CryptoUtil = require('../../actors/utils/crypto-util');

if (cluster.isMaster) {
  for (var i = 0; i < numCPUs; i++) {
    // Create a worker
    cluster.fork();
  }

} else {
  // Workers share the TCP connection in this server
  const app = express();
  app.use(bodyParser.json());

  app.post('/', async function (req, res) {
    const offChainPayload = req.body.payload;
    const privateKey = req.body.privateKey;
    const address = req.body.address;
  
    const payloadForISP = await CryptoUtil.decryptPayload(privateKey, offChainPayload);
    const auth = payloadForISP.authPayload;
    const authSignature = payloadForISP.authSignature;

    const isValid = CryptoUtil.verifyPayload(authSignature, auth, address);
    if (isValid) {
      res.status(200).send('authentication attempt successful!');
    } else {
      res.status(400).send('signature invalid!');
    }
  });
  
  app.listen(HTTP_PORT, () => {
    console.log(`Hit me up on ${HOSTNAME}.local:${HTTP_PORT}`);
  });
}

cluster.on('exit', function(worker, code, signal) {
  console.log('Worker %d died with code/signal %s. Restarting worker...', worker.process.pid, signal || code);
  cluster.fork();
});