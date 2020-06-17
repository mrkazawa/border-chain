const chalk = require('chalk');
const log = console.log;

const CryptoUtil = require('../utils/crypto-util');

const Contract = require('./contract');
const Messenger = require('./messenger');

const OWNER = CryptoUtil.createNewIdentity();
const GATEWAY = CryptoUtil.createNewIdentity();

async function main() {
  const contract = await prepare();
  if (contract == undefined) throw new Error('Error when preparing');

  const user = createUserCredential();
  const ispInfo = await Messenger.sendUserRegistrationToIsp(OWNER.address, user.username, user.password);

  const isp = {
    address: ispInfo.address,
    publicKey: ispInfo.publicKey
  }

  const auth = createAuthenticationPayload(user, ispInfo.routerIP);
  const authHash = CryptoUtil.hashPayload(auth);

  contract.addStoredPayloadEventListener(OWNER, auth, isp);
  contract.addGatewayVerifiedEventListener(GATEWAY);
  contract.storeGatewayAuthPayload(authHash, GATEWAY.address, isp.address, OWNER);
}

async function prepare() {
  const [assigned, registered, abi] = await Promise.all([
    Messenger.assignEtherToOwner(OWNER.address),
    Messenger.registerGatewayToAdmin(GATEWAY.address, GATEWAY.publicKey, GATEWAY.privateKey),
    Messenger.getContractAbi()
  ]);

  log(chalk.yellow(assigned));
  log(chalk.yellow(registered));
  const contract = new Contract(abi);

  return contract;
}

function createUserCredential() {
  return {
    username: 'john',
    password: 'fish'
  };
}

function createAuthenticationPayload(userCredential, routerIP) {
  userCredential.routerIP = routerIP;
  userCredential.timestamp = Date.now();
  userCredential.nonce = CryptoUtil.randomValueBase64(64);

  return userCredential;
}

main();