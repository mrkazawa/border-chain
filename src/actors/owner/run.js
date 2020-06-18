const chalk = require('chalk');
const log = console.log;

const CryptoUtil = require('../utils/crypto-util');

const Contract = require('./contract');
const Messenger = require('./messenger');

const OWNER = CryptoUtil.createNewIdentity();
const GATEWAY = CryptoUtil.createNewIdentity();

async function main() {
  const [contract, user, ispInfo] = await prepare();
  const auth = createAuthenticationPayload(user, ispInfo.routerIP);
  const authHash = CryptoUtil.hashPayload(auth);

  const isp = {
    address: ispInfo.address,
    publicKey: ispInfo.publicKey
  }

  contract.addStoredPayloadEventListener(OWNER, auth, isp);
  contract.addGatewayVerifiedEventListener(GATEWAY);
  contract.storeGatewayAuthPayload(authHash, GATEWAY.address, isp.address, OWNER);
}

async function prepare() {
  try {
    const [assigned, registered, abi] = await Promise.all([
      Messenger.seedEtherToOwner(OWNER.address),
      Messenger.registerGatewayToAdmin(GATEWAY.address, GATEWAY.publicKey, GATEWAY.privateKey),
      Messenger.getContractAbi()
    ]);

    log(chalk.yellow(assigned));
    log(chalk.yellow(registered));

    const contract = new Contract(abi);
    const user = createUserCredential();
    const ispInfo = await Messenger.sendUserRegistrationToIsp(OWNER.address, user.username, user.password);

    return [contract, user, ispInfo];

  } catch (err) {
    throw new Error('error when preparing!');
  }

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