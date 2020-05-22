const chalk = require('chalk');

const CryptoUtil = require('./utils/crypto-util');
const EthereumUtil = require('./utils/ethereum-util');
const HttpUtil = require('./utils/http-util');

const {
  NETWORK_ID
} = require('./utils/config');

let RC; // global variable for deployed Registry Contract
const OWNER = CryptoUtil.createNewIdentity();
const GATEWAY = CryptoUtil.createNewIdentity();

function getAuthenticationPayload() {
  // example of authentication payload for the ISP
  return {
    username: 'john',
    password: 'fish',
    routerIP: '200.100.10.10',
    nonce: CryptoUtil.randomValueBase64(64)
  };
}

async function prepare() {
  const [assigned, isp, contract] = await Promise.all([
    HttpUtil.assignEther(OWNER.address),
    HttpUtil.getIspInfo(),
    HttpUtil.getContractAbi()
  ]);

  console.log(chalk.yellow(assigned));

  const contractAbi = contract.abi;
  const contractAddress = contract.networks[NETWORK_ID].address;
  RC = EthereumUtil.constructSmartContract(contractAbi, contractAddress);

  return isp;
}

async function main() {
  const isp = await prepare();
  const auth = getAuthenticationPayload();
  const authHash = CryptoUtil.hashPayload(auth);
  
  // sending transaction to register payload to the smart contract
  let tx = await RC.methods.storeAuthNPayload(authHash, GATEWAY.address, isp.address).send({
    from: OWNER.address,
    gas: 1000000
  });

  const event = tx.events.NewPayloadAdded;
  if (typeof event !== 'undefined' && event) {
    console.log(chalk.yellow(`Storing Authn Tx from: ${event.returnValues['sender']}`));
    console.log(chalk.yellow(`Authn payload: ${event.returnValues['payloadHash']}`));

    const authSignature = CryptoUtil.signPayload(OWNER.privateKey, auth);
    const payloadForISP = {
      authPayload: auth,
      authSignature: authSignature
    };
    const offChainPayload = await CryptoUtil.encryptPayload(isp.publicKey, payloadForISP);
    console.log(offChainPayload);

    const result = await HttpUtil.sendAuthPayloadToIsp(offChainPayload);
    console.log(result);

  } else {
    console.log(chalk.red('Cannot store auth payload Tx to blockchain!'));
  }
}

main();