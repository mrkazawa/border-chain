const express = require('express');
const bodyParser = require('body-parser');

const os = require("os");
const HOSTNAME = os.hostname();
const HTTP_PORT = process.env.HTTP_PORT || 5000;

const app = express();
app.use(bodyParser.json());

app.post('/', function (req, res) {
  const offChainPayload = req.body.payload;
  const privateKey = req.body.privateKey;

  res.status(200).send('authentication attempt successful!');
});

app.listen(HTTP_PORT, () => {
  console.log(`Hit me up on ${HOSTNAME}.local:${HTTP_PORT}`);
});