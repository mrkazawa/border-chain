const chalk = require('chalk');

const Tools = require('./tools');
const {
  NETWORK_ID,
  ABI_URL
} = require('./config');

const OWNER_CREDS_PATH = './creds/owner.json';
const ISP_CREDS_PATH = './creds/isp.json';
const GATEWAY_CREDS_PATH = './creds/gateway.json';

const ownerAddress = Tools.extractAddress(Tools.readJsonFile(OWNER_CREDS_PATH));
const ownerPrivateKey = Tools.extractPrivateKey(Tools.readJsonFile(OWNER_CREDS_PATH));

const ispAddress = Tools.extractAddress(Tools.readJsonFile(ISP_CREDS_PATH));
const ispPublicKey = Tools.extractPublicKey(Tools.readJsonFile(ISP_CREDS_PATH));

const gatewayAddress = Tools.extractAddress(Tools.readJsonFile(GATEWAY_CREDS_PATH));

async function getContractAbi() {
  const options = {
    method: 'get',
    url: ABI_URL
  };

  const response = await Tools.sendRequest(options);
  if (response instanceof Error) console.log(chalk.red('Cannot get the contract abi'));

  return response.data;
}

async function main() {
  const contract = await getContractAbi();
  const contractAbi = contract.abi;
  const contractAddress = contract.networks[NETWORK_ID].address;
  const RC = Tools.constructSmartContract(contractAbi, contractAddress);



  // example of authentication payload for the ISP
  const auth = {
    username: 'john',
    password: 'fish',
    routerIP: '200.100.10.10',
    nonce: tools.randomValueBase64(32)
  };
  const authPayload = JSON.stringify(auth);
  const authPayloadHash = tools.hashPayload(authPayload);

  // sending transaction to register payload to the smart contract
  let tx = await RC.methods.storeAuthNPayload(authPayloadHash, gatewayAddress, ISPAddress).send({
    from: ownerAddress,
    gas: 1000000
  });
  if (typeof tx.events.NewPayloadAdded !== 'undefined') {
    const event = tx.events.NewPayloadAdded;
    console.log('Tx stored in the block!');
    console.log('Storing Authn Tx from: ', event.returnValues['sender']);
    console.log('Authn payload: ', event.returnValues['payloadHash']);

    const authSignature = tools.signPayload(authPayloadHash, ownerPrivateKey);
    const payloadForISP = {
      authPayload: authPayload,
      authSignature: authSignature
    };
    const stringForISP = JSON.stringify(payloadForISP);
    const offChainPayload = await tools.encryptPayload(stringForISP, ISPPublicKey);

    const options = {
      method: 'post',
      url: url,
      data: payload
    };

    // sending authentication payload to the ISP
    let options = {
      method: 'POST',
      uri: tools.getISPAuthnEndpoint(),
      body: {
        offChainPayload
      },
      resolveWithFullResponse: true,
      json: true // Automatically stringifies the body to JSON
    };
    rp(options).then(function (response) {
      console.log('Response status code: ', response.statusCode)
      console.log('Response body: ', response.body);
    }).catch(function (err) {
      console.log(err);
    });
  } else {
    console.log('cannot store auth payload Tx to blockchain!');
  }
}

main();