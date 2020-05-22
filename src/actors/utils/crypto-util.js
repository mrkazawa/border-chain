const EthCrypto = require('eth-crypto');
const crypto = require('crypto');
//const web3 = require('./web3');

// for symmetric encryption and decryption
const algorithm = 'aes256';
const inputEncoding = 'utf8';
const outputEncoding = 'hex';

class CryptoUtil {
  static randomValueBase64(len) {
    return crypto
      .randomBytes(Math.ceil((len * 3) / 4))
      .toString('base64') // convert to base64 format
      .slice(0, len) // return required number of characters
      .replace(/\+/g, '0') // replace '+' with '0'
      .replace(/\//g, '0'); // replace '/' with '0'
  }

  static createNewIdentity() {
    return EthCrypto.createIdentity();
  }

  static hashPayload(payload) {
    const string = JSON.stringify(payload);
    return EthCrypto.hash.keccak256(string);
  }

  static signPayload(privateKey, payload) {
    const payloadHash = CryptoUtil.hashPayload(payload);
    return EthCrypto.sign(privateKey, payloadHash);
  }

  static verifyPayload(signature, payload, signer) {
    const payloadHash = CryptoUtil.hashPayload(payload);
    const address = EthCrypto.recover(signature, payloadHash);
    return (address == signer);
  }

  static async encryptPayload(publicKey, payload) {
    const string = JSON.stringify(payload);
    const encrypted = await EthCrypto.encryptWithPublicKey(publicKey, string);
    return EthCrypto.cipher.stringify(encrypted);
  }

  static async decryptPayload(privateKey, payload) {
    const encrypted = EthCrypto.cipher.parse(payload);
    const decrypted = await EthCrypto.decryptWithPrivateKey(privateKey, encrypted);
    return JSON.parse(decrypted);
  }
}

module.exports = CryptoUtil;