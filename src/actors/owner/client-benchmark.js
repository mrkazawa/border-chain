const chalk = require('chalk');
const log = console.log;

const CryptoUtil = require('../utils/crypto-util');

const EthereumUtil = require('../utils/ethereum-util');
const Messenger = require('./messenger');
const PayloadDatabase = require('./db/payload_db');
const SystemDatabase = require('./db/system_db');

const OWNER = CryptoUtil.createNewIdentity();
const GATEWAY = CryptoUtil.createNewIdentity();

const {
  ETH_NETWORK_ID
} = require('./config');

const {
  performance
} = require('perf_hooks');

// number of repetitions
const NUMBER_OF_EPOCH = 10000;

async function main() {
  const [abi, user, ispInfo] = await initiateSystemParameters();
  const auth = createAuthenticationPayload(user, ispInfo.routerIp);
  const authHash = CryptoUtil.hashPayload(auth);

  const isp = {
    address: ispInfo.address,
    publicKey: ispInfo.publicKey
  };

  const contractAddress = abi.networks[ETH_NETWORK_ID].address;
  const contract = EthereumUtil.constructSmartContract(abi.abi, contractAddress);
  let nonce = 0;

  // start benchmarking
  const start = performance.now();

  for (let i = 0; i < NUMBER_OF_EPOCH; i++) {
    const storeAuth = contract.methods.storePayload(authHash, GATEWAY.address, isp.address).encodeABI();

    const storeAuthTx = {
      from: OWNER.address,
      to: contractAddress,
      nonce: nonce,
      gasLimit: 5000000,
      gasPrice: 5000000000,
      data: storeAuth
    };

    const signedStoreAuthTx = CryptoUtil.signTransaction(OWNER.privateKey, storeAuthTx);
    // do not send the transaction
    nonce++;

    await PayloadDatabase.storeNewPayload(authHash, OWNER.address, GATEWAY.address, isp.address);

    // bypass blockchain network,
    // we assume that the payload is directly stored
    await PayloadDatabase.updatePayloadStateToStored(authHash);

    const payloadSignature = CryptoUtil.signPayload(OWNER.privateKey, auth);
    const payloadForIsp = {
      payload: auth,
      payloadSignature: payloadSignature
    };
    const offChainPayload = await CryptoUtil.encryptPayload(isp.publicKey, payloadForIsp);

    // do not send the payload to isp
  }

  const end = performance.now();
  const elapsed = end - start;
  log(`ends in ${elapsed} milliseconds`);

  const opsPerSecond = NUMBER_OF_EPOCH / elapsed * 1000;
  log(`${opsPerSecond} operations per second`);
}

async function initiateSystemParameters() {
  try {
    const [assigned, abi] = await Promise.all([
      Messenger.seedEtherToOwner(OWNER.address),
      Messenger.getContractAbi(),
      SystemDatabase.storeOwnerIdentity(OWNER)
    ]);

    log(chalk.yellow(assigned));

    const user = createDomainOwnerCredential();
    const ispInfo = await Messenger.sendUserRegistrationToIsp(OWNER.address, user.username, user.password);

    return [abi, user, ispInfo];

  } catch (err) {
    throw new Error(`error when initiating system parameters! ${err}`);
  }
}

function createDomainOwnerCredential() {
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