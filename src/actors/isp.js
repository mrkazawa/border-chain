const express = require('express');
const chalk = require('chalk');

const CryptoUtil = require('./utils/crypto-util');
const EthereumUtil = require('./utils/ethereum-util');
const HttpUtil = require('./utils/http-util');

const os = require("os");
const HOSTNAME = os.hostname();
const HTTP_PORT = process.env.HTTP_PORT || 3000;

const {
  NETWORK_ID
} = require('./utils/config');

/**
 * our mock of users data stored in the ISP
 * in real life, this data is collected by ISP during users
 * registration and then stored in database.
 */
const storedData = {
  username: 'john',
  password: 'fish',
  routerIP: '200.100.10.10'
};

// global variable for deployed Registry Contract
let RC;
let contractAddress;
const ISP = CryptoUtil.createNewIdentity();

const app = express();
app.use(express.json());

app.post('/authenticate', async (req, res) => {
  const offChainPayload = req.body.payload;
  console.log(offChainPayload);

  const payloadForISP = await CryptoUtil.decryptPayload(ISP.privateKey, offChainPayload);
  
  const auth = payloadForISP.authPayload;
  const authSignature = payloadForISP.authSignature;
  const authHash = CryptoUtil.hashPayload(auth);

  const payload = await RC.methods.getPayloadDetail(authHash).call();
  const source = payload[0];
  const verifier = payload[2];
  const isValue = payload[3];
  const isVerified = payload[4];

  if (verifier == ISP.address && isValue && !isVerified) {
    
    const isValid = CryptoUtil.verifyPayload(authSignature, auth, source);
    if (isValid) {
      // TODO: checking auth.nonce in real production with database connection
      // check if username & password exist in the database
      // also chedk if the IP of the user is correct
      if (
        auth.username == storedData.username &&
        auth.password == storedData.password &&
        auth.routerIP == storedData.routerIP
      ) {
        const routerIPInBytes = EthereumUtil.convertStringToByte(storedData.routerIP);
        const verifyAuth =  RC.methods.verifyAuthNGateway(authHash, routerIPInBytes).encodeABI();
        const verifyAuthTx = {
          from: ISP.address,
          to: contractAddress,
          nonce: 0,
          gasLimit: 5000000,
          gasPrice: 5000000000,
          data: verifyAuth
        };

        const signedVerifyAuthTx = CryptoUtil.signTransaction(ISP.privateKey, verifyAuthTx);
        await EthereumUtil.sendTransaction(signedVerifyAuthTx);

        res.status(200).send('authentication attempt successful!');
      } else {
        res.status(403).send('invalid authentication payload!');
      }
    } else {
      res.status(403).send('invalid signature!');
    }
  } else {
    res.status(404).send('payload not found in blockchain!');
  }
});

app.listen(HTTP_PORT, () => {
  console.log(`Hit me up on ${HOSTNAME}.local:${HTTP_PORT}`);
});

async function prepare() {
  const [assigned, registered, contract] = await Promise.all([
    HttpUtil.assignEther(ISP.address),
    HttpUtil.registerISP(ISP.address, ISP.publicKey),
    HttpUtil.getContractAbi()
  ]);

  console.log(chalk.yellow(assigned));
  console.log(chalk.yellow(registered));

  const contractAbi = contract.abi;
  contractAddress = contract.networks[NETWORK_ID].address;
  RC = EthereumUtil.constructSmartContract(contractAbi, contractAddress);
}

prepare();