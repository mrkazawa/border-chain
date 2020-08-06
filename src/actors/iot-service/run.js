const chalk = require('chalk');
const log = console.log;

const CryptoUtil = require('../utils/crypto-util');

const Messenger = require('./messenger');

const SERVICE = CryptoUtil.createNewIdentity();

async function main() {
  const [abi, gateway, retirevedAccesses] = await initiateSystemParameters();

  const accesses = retirevedAccesses.accesses;
  const accessesSignature = retirevedAccesses.accessesSignature;

  const isValid = CryptoUtil.verifyPayload(accessesSignature, accesses, gateway.address);
  if (!isValid) throw new Error('accesses signature is invalid!');

  log('retireved access:', accesses);
}

async function initiateSystemParameters() {
  try {
    const [assigned, abi, gateway, accesses] = await Promise.all([
      Messenger.seedEtherToService(SERVICE.address),
      Messenger.getContractAbi(),
      Messenger.getGatewayInfo(),
      Messenger.getAccessList()
    ]);

    log(chalk.yellow(assigned));

    return [abi, gateway, accesses];

  } catch (err) {
    throw new Error(`error when initiating system parameters! ${err}`);
  }
}

main();