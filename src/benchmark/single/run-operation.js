const {
  performance
} = require('perf_hooks');

const CryptoUtil = require('../../actors/utils/crypto-util');
const {
  NUMBER_OF_EPOCH,
  NUMBER_OF_REPEAT,
  OPERATION,
  createFakeIspPayload
} = require('../bench-tools');

const OWNER = CryptoUtil.createNewIdentity();
const AUTH = createFakeIspPayload();
let ENCRYPTED;

const run = async function (mode) {
  if (mode == OPERATION.DECRYPT_PAYLOAD) {
    ENCRYPTED = await CryptoUtil.encryptPayload(OWNER.publicKey, AUTH);
  }

  for (let j = 0; j < NUMBER_OF_REPEAT; j++) {
    console.log(`Running #${j} ...`);

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
      }

      if (++counter == NUMBER_OF_EPOCH) {
        const end = performance.now();
        counter = 0;

        console.log(`End in: ${end - start} milliseconds`);
      }
    }
  }
}

module.exports = {
  run
}