const fs = require('fs');

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
      CURRENT_MODE = 'sign-payload';
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

  if (mode == OPERATION.DECRYPT_PAYLOAD) {
    ENCRYPTED = await CryptoUtil.encryptPayload(OWNER.publicKey, AUTH);
  }

  let counter = 0;
  const start = performance.now();

  for (let i = 0; i < NUMBER_OF_EPOCH; i++) {

    if (mode == OPERATION.SIGN_PAYLOAD) {
      const signed = await CryptoUtil.signPayload(OWNER.privateKey, AUTH);
      if (!signed) {
        throw new Error('Something wrong during operation!');
      }

    } else if (mode == OPERATION.ENCRYPT_PAYLOAD) {
      const encyrpted = await CryptoUtil.encryptPayload(OWNER.publicKey, AUTH);
      if (!encyrpted) {
        throw new Error('Something wrong during operation!');
      }

    } else if (mode == OPERATION.DECRYPT_PAYLOAD) {
      const decrypted = await CryptoUtil.decryptPayload(OWNER.privateKey, ENCRYPTED);
      if (!decrypted) {
        throw new Error('Something wrong during operation!');
      }

    } else if (mode == OPERATION.SIGN_TRANSACTION) {
      const storeAuth = RC.methods.storeAuthNPayload(AUTH_HASH, GATEWAY.address, ISP.address).encodeABI();
      const storeAuthTx = {
        from: OWNER.address,
        to: contractAddress,
        nonce: TX_NONCE,
        gasLimit: 5000000,
        gasPrice: 5000000000,
        data: storeAuth
      };

      const signedStoreAuthTx = CryptoUtil.signTransaction(OWNER.privateKey, storeAuthTx);
      if (!signedStoreAuthTx) {
        throw new Error('Something wrong during operation!');
      }

      TX_NONCE++;
    }

    if (++counter == NUMBER_OF_EPOCH) {
      const end = performance.now();
      counter = 0;

      const elapsed = end - start;

      const row = elapsed + "\r\n";
      fs.appendFileSync(`./${CURRENT_MODE}.csv`, row);
  
      console.log(`${CURRENT_MODE} ends in: ${elapsed} milliseconds`);
      process.exit(1); // kill, because the ethereum web socket always on!
    }
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