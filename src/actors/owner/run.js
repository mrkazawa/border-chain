const chalk = require('chalk');
const log = console.log;

const CryptoUtil = require('../utils/crypto-util');

const Contract = require('./contract');
const Messenger = require('./messenger');

const OWNER = CryptoUtil.createNewIdentity();
const GATEWAY = CryptoUtil.createNewIdentity();

async function main() {
  const [isp, contract] = await prepare();
  if (isp == undefined || contract == undefined) throw new Error('Error when preparing');

  const user = createUserCredential();
  const registered = await Messenger.sendUserRegistrationToIsp(user.username, user.password, user.routerIP);
  log(chalk.yellow(registered));

  const auth = createAuthenticationPayload(user);
  const authHash = CryptoUtil.hashPayload(auth);

  contract.addStoredPayloadEventListener(OWNER, auth, isp);
  contract.addGatewayVerifiedEventListener(GATEWAY);
  contract.storeGatewayAuthPayload(authHash, GATEWAY.address, isp.address, OWNER);
}

async function prepare() {
  const [assigned, registered, isp, abi] = await Promise.all([
    Messenger.assignEtherToOwner(OWNER.address),
    Messenger.registerGatewayToAdmin(GATEWAY.address, GATEWAY.publicKey, GATEWAY.privateKey),
    Messenger.getIspInfo(),
    Messenger.getContractAbi()
  ]);

  log(chalk.yellow(assigned));
  log(chalk.yellow(registered));
  const contract = new Contract(abi);

  return [isp, contract];
}

function createUserCredential() {
  return {
    username: 'john',
    password: 'fish',
    routerIP: '200.100.10.10'
  };
}

function createAuthenticationPayload(userCredential) {
  userCredential.timestamp = Date.now();
  userCredential.nonce = CryptoUtil.randomValueBase64(64);

  return userCredential;
}

main();