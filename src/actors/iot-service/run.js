const chalk = require('chalk');
const log = console.log;

const CryptoUtil = require('../utils/crypto-util');

const Contract = require('./contract');
const Messenger = require('./messenger');
const PayloadDatabase = require('./db/payload-db');
const SystemDatabase = require('./db/system-db');

const SERVICE = CryptoUtil.createNewIdentity();

async function main() {
  const [abi, gateway, responses] = await initiateSystemParameters();

  const accesses = responses.accesses;
  const accessesSignature = responses.accessesSignature;

  const isValid = CryptoUtil.verifyPayload(accessesSignature, accesses, gateway.address);
  if (!isValid) throw new Error('accesses signature is invalid!');

  log('retireved access:', accesses);

  const chosenAccesses = accesses.slice(0, 2); // we choose the first two accesses
  const auth = constructAuthorizationPayload(chosenAccesses);
  const authHash = CryptoUtil.hashPayload(auth);

  const contract = new Contract(abi);
  contract.addPayloadAddedEventListener(SERVICE, auth, gateway);
  contract.addAccessApprovedEventListener(SERVICE, gateway);
  contract.storePayload(authHash, gateway.address, SERVICE);

  PayloadDatabase.storeNewPayload(authHash, SERVICE.address, SERVICE.address, gateway.address);
}

async function initiateSystemParameters() {
  try {
    const [assigned, abi, gateway, responses] = await Promise.all([
      Messenger.seedEtherToService(SERVICE.address),
      Messenger.getContractAbi(),
      Messenger.getGatewayInfo(),
      Messenger.getAccessList(SERVICE.address),
      SystemDatabase.storeServiceIdentity(SERVICE)
    ]);

    log(chalk.yellow(assigned));

    return [abi, gateway, responses];

  } catch (err) {
    throw new Error(`error when initiating system parameters! ${err}`);
  }
}

function constructAuthorizationPayload(accesses) {
  return {
    accesses: accesses,
    timestamp: Date.now(),
    nonce: CryptoUtil.randomValueBase64(64)
  }
}

main();