const chalk = require('chalk');
const log = console.log;

const CryptoUtil = require('../utils/crypto-util');

const Contract = require('./contract');
const Messenger = require('./messenger');

const OWNER = CryptoUtil.createNewIdentity();
const GATEWAY = CryptoUtil.createNewIdentity();

async function main() {
  const [abi, user, ispInfo] = await prepare();
  const auth = createAuthenticationPayload(user, ispInfo.routerIp);
  const authHash = CryptoUtil.hashPayload(auth);

  const isp = {
    address: ispInfo.address,
    publicKey: ispInfo.publicKey
  }

  const contract = new Contract(abi);
  contract.addPayloadAddedEventListener(OWNER, auth, isp);
  contract.addGatewayApprovedEventListener(GATEWAY);
  contract.storePayload(authHash, GATEWAY.address, isp.address, OWNER);
}

async function prepare() {
  try {
    const [assigned, abi] = await Promise.all([
      Messenger.seedEtherToOwner(OWNER.address),
      Messenger.getContractAbi()
    ]);

    log(chalk.yellow(assigned));

    const user = createUserCredential();
    const ispInfo = await Messenger.sendUserRegistrationToIsp(OWNER.address, user.username, user.password);

    return [abi, user, ispInfo];

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

function createAuthenticationPayload(userCredential, routerIp) {
  userCredential.routerIp = routerIp;
  userCredential.timestamp = Date.now();
  userCredential.nonce = CryptoUtil.randomValueBase64(64);

  return userCredential;
}

main();