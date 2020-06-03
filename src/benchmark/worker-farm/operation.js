const workerFarm = require('worker-farm');
const fs = require('fs');

const FARM_OPTIONS = {
  maxConcurrentWorkers: require('os').cpus().length,
  maxCallsPerWorker: Infinity,
  maxConcurrentCallsPerWorker: Infinity
};

const workers = workerFarm(FARM_OPTIONS, require.resolve('../worker'), [
  'signPayload',
  'verifyPayload',
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
  ETH_NETWORK_ID
} = require('../../actors/config');

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
let SIGNED_PAYLOAD;

let RC;
let CURRENT_MODE;
let TX_NONCE = 0;

let counter = 0;

async function prepareContract() {
  const contract = await HttpUtil.getContractAbi();
  const contractAbi = contract.abi;
  const contractAddress = contract.networks[ETH_NETWORK_ID].address;
  RC = EthereumUtil.constructSmartContract(contractAbi, contractAddress);

  return contractAddress;
}

function assignCurrentMode(mode) {
  switch (mode) {
    case OPERATION.SIGN_PAYLOAD:
      CURRENT_MODE = 'sign-payload';
      break;
    case OPERATION.VERIFY_PAYLOAD:
      CURRENT_MODE = 'verify-payload';
      break;
    case OPERATION.ENCRYPT_PAYLOAD:
      CURRENT_MODE = 'encrypt-payload';
      break;
    case OPERATION.DECRYPT_PAYLOAD:
      CURRENT_MODE = 'decrypt-payload';
      break;
    case OPERATION.SIGN_TRANSACTION:
      CURRENT_MODE = 'sign-transaction';
      break;
  }
}

async function run(mode) {
  assignCurrentMode(mode);
  const contractAddress = await prepareContract();
  const storeAuth = RC.methods.storeAuthNPayload(AUTH_HASH, GATEWAY.address, ISP.address).encodeABI();

  if (mode == OPERATION.VERIFY_PAYLOAD) {
    SIGNED_PAYLOAD = CryptoUtil.signPayload(OWNER.privateKey, AUTH);

  } else if (mode == OPERATION.DECRYPT_PAYLOAD) {
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

    } else if (mode == OPERATION.VERIFY_PAYLOAD) {
      workers.verifyPayload(SIGNED_PAYLOAD, AUTH, OWNER.address, function (err, verified) {
        if (!verified) {
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

    const elapsed = end - start;

    const row = elapsed + "\r\n";
    fs.appendFileSync(`./${CURRENT_MODE}.csv`, row);

    console.log(`${CURRENT_MODE} ends in: ${elapsed} milliseconds`);
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