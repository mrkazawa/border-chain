const workerFarm = require('worker-farm');

const FARM_OPTIONS = {
  maxConcurrentWorkers: require('os').cpus().length,
  maxCallsPerWorker: Infinity,
  maxConcurrentCallsPerWorker: 1
};

const workers = workerFarm(FARM_OPTIONS, require.resolve('./worker'), [
  'signPayload',
  'encryptPayload',
  'decryptPayload',
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
let CURRENT_MODE;
let TX_NONCE = 0;

let counter = 0;

async function prepareContract() {
  const contract = await HttpUtil.getContractAbi();
  const contractAbi = contract.abi;
  const contractAddress = contract.networks[NETWORK_ID].address;
  RC = EthereumUtil.constructSmartContract(contractAbi, contractAddress);

  return contractAddress;
}

function assignCurrentMode(mode) {
  switch (mode) {
    case OPERATION.SIGN_PAYLOAD:
      CURRENT_MODE = 'Sign Payload';
      break;
    case OPERATION.ENCRYPT_PAYLOAD:
      CURRENT_MODE = 'Encrypt Payload';
      break;
    case OPERATION.DECRYPT_PAYLOAD:
      CURRENT_MODE = 'Decrypt Payload';
      break;
    case OPERATION.SIGN_TRANSACTION:
      CURRENT_MODE = 'Sign Transaction';
      break;
  }
}

async function run(mode) {
  assignCurrentMode(mode);
  const contractAddress = await prepareContract();

  if (mode == OPERATION.DECRYPT_PAYLOAD) {
    ENCRYPTED = await CryptoUtil.encryptPayload(OWNER.publicKey, AUTH);
  }

  const start = performance.now();

  for (let i = 0; i < NUMBER_OF_EPOCH; i++) {

    if (mode == OPERATION.SIGN_PAYLOAD) {
      workers.signPayload(OWNER.privateKey, AUTH, function (err, signed) {
        if (!signed) {
          throw new Error('Something wrong during operation!');
        }

        closing(start);
      });

    } else if (mode == OPERATION.ENCRYPT_PAYLOAD) {
      workers.encryptPayload(OWNER.publicKey, AUTH, function (err, encrypted) {
        if (!encrypted) {
          throw new Error('Something wrong during operation!');
        }

        closing(start);
      });

    } else if (mode == OPERATION.DECRYPT_PAYLOAD) {
      workers.decryptPayload(OWNER.privateKey, ENCRYPTED, function (err, decrypted) {
        if (!decrypted) {
          throw new Error('Something wrong during operation!');
        }

        closing(start);
      });

    } else if (mode == OPERATION.SIGN_TRANSACTION) {
      const storeAuth = RC.methods.storeAuthNPayload(AUTH_HASH, GATEWAY.address, ISP.address).encodeABI();
      workers.signTransaction(OWNER.privateKey, OWNER.address, contractAddress, TX_NONCE, storeAuth, function (err, signed) {
        if (!signed) {
          throw new Error('Something wrong during operation!');
        }

        TX_NONCE++;
        closing(start);
      });
    }
  }
}

function closing(start) {
  if (++counter == NUMBER_OF_EPOCH) {
    workerFarm.end(workers);
    const end = performance.now();
    counter = 0;

    console.log(`${CURRENT_MODE} ends in: ${end - start} milliseconds`);
    process.exit(1); // kill, because the ethereum web socket always on!
  }
}

if (process.argv.length !== 3) {
  console.error('You have to put only one argument in integer: the OPERATION!');
  process.exit(1);

} else {
  if (process.argv[2]) {
    run(parseInt(process.argv[2]));

  } else {
    console.error('Your argument is invalid');
    process.exit(1);
  }
}