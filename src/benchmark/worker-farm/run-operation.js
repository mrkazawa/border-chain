const workerFarm = require('worker-farm');

const FARM_OPTIONS = {
  maxConcurrentWorkers: require('os').cpus().length,
  maxCallsPerWorker: Infinity,
  maxConcurrentCallsPerWorker: 1
};

const workers = workerFarm(FARM_OPTIONS, require.resolve('./child'), [
  'signPayload',
  'encryptPayload',
  'decryptPayload',
  'encodeTx',
  'signTransaction'
]);

const {
  performance
} = require('perf_hooks');

const CryptoUtil = require('../../actors/utils/crypto-util');
const EthereumUtil = require('../../actors/utils/ethereum-util');
const HttpUtil = require('../../actors/utils/http-util');

const {
  NETWORK_ID
} = require('../../actors/utils/config');

const {
  NUMBER_OF_EPOCH,
  NUMBER_OF_REPEAT,
  OPERATION,
  createFakeIspPayload
} = require('../bench-tools');

const OWNER = CryptoUtil.createNewIdentity();
const GATEWAY = CryptoUtil.createNewIdentity();
const ISP = CryptoUtil.createNewIdentity();
const AUTH = createFakeIspPayload();
const AUTH_HASH = CryptoUtil.hashPayload(AUTH);

let ENCRYPTED;
let RC;
let TX_NONCE = 0;

const PAYLOAD = {
  hash: AUTH_HASH,
  gatewayAddress: GATEWAY.address,
  ispAddress: ISP.address
}

async function prepareContract() {
  const contract = await HttpUtil.getContractAbi();
  const contractAbi = contract.abi;
  const contractAddress = contract.networks[NETWORK_ID].address;
  RC = EthereumUtil.constructSmartContract(contractAbi, contractAddress);

  return contractAddress;
}

const run = async function () {
  const contractAddress = await prepareContract();

  let counter = 0;
  const start = performance.now();

  for (let i = 0; i < NUMBER_OF_EPOCH; i++) {

    const storeAuth = RC.methods.storeAuthNPayload(AUTH_HASH, GATEWAY.address, ISP.address).encodeABI();

    workers.signTransaction(OWNER.privateKey, OWNER.address, contractAddress, TX_NONCE, storeAuth, function (err, signed) {
      //console.log(signed);
      TX_NONCE++;

      if (++counter == NUMBER_OF_EPOCH) {
        const end = performance.now();
        workerFarm.end(workers);
        counter = 0;

        console.log(`End in: ${end - start} milliseconds`);
      }
    });
  }
}

module.exports = {
  run
}