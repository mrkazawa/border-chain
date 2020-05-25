const CryptoUtil = require('../../actors/utils/crypto-util');

const signPayload = function (privateKey, payload, callback) {
  const signed = CryptoUtil.signPayload(privateKey, payload);
  callback(null, signed);
}

const encryptPayload = async function (publicKey, payload, callback) {
  const encrypted = await CryptoUtil.encryptPayload(publicKey, payload);
  callback(null, encrypted);
}

const decryptPayload = async function (privateKey, payload, callback) {
  const decrypted = await CryptoUtil.decryptPayload(privateKey, payload);
  callback(null, decrypted);
}

module.exports = {
  signPayload,
  encryptPayload,
  decryptPayload
}