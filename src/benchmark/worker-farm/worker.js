const CryptoUtil = require('../../actors/utils/crypto-util');

const signPayload = function (privateKey, payload, callback) {
  const signed = CryptoUtil.signPayload(privateKey, payload);
  callback(null, signed);
}

const verifyPayload = function (signature, payload, signer, callback) {
  const verified = CryptoUtil.verifyPayload(signature, payload, signer);
  callback(null, verified);
}

const encryptPayload = async function (publicKey, payload, callback) {
  const encrypted = await CryptoUtil.encryptPayload(publicKey, payload);
  callback(null, encrypted);
}

const decryptPayload = async function (privateKey, payload, callback) {
  const decrypted = await CryptoUtil.decryptPayload(privateKey, payload);
  callback(null, decrypted);
}
 
const signTransaction = async function (privateKey, sourceAddress, destinationAddress, txNonce, data, callback) {
  const storeAuthTx = {
    from: sourceAddress,
    to: destinationAddress,
    nonce: txNonce,
    gasLimit: 5000000,
    gasPrice: 5000000000,
    data: data
  };

  const signedStoreAuthTx = CryptoUtil.signTransaction(privateKey, storeAuthTx);
  callback(null, signedStoreAuthTx);
}

module.exports = {
  signPayload,
  verifyPayload,
  encryptPayload,
  decryptPayload,
  signTransaction
}