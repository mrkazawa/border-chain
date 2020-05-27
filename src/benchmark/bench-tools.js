const CryptoUtil = require('../actors/utils/crypto-util');

/**
 * How many times we do the performed operations.
 * Whether it is sign, verify, encrypt, decrypt, write, or call.
 */
const NUMBER_OF_EPOCH = 100000;

/**
 * Mode of operations in our benchmark scenario.
 */
const OPERATION = {
  SIGN_PAYLOAD: 1,
  VERIFY_PAYLOAD: 2,
  ENCRYPT_PAYLOAD: 3,
  DECRYPT_PAYLOAD: 4,
  SIGN_TRANSACTION: 5
};

const createFakeIspPayload = function () {
  return {
    username: 'john',
    password: 'fish',
    routerIP: '200.100.10.10',
    nonce: CryptoUtil.randomValueBase64(64)
  };
}

module.exports = {
  NUMBER_OF_EPOCH,
  OPERATION,
  createFakeIspPayload
}