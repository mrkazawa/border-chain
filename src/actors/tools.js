const ethCrypto = require('eth-crypto');
const crypto = require('crypto');
const fs = require('fs');
const axios = require('axios').default;
const web3 = require('./utils/web3');

// for symmetric encryption and decryption
const algorithm = 'aes256';
const inputEncoding = 'utf8';
const outputEncoding = 'hex';

class Tools {
  static randomValueBase64(len) {
    return crypto
      .randomBytes(Math.ceil((len * 3) / 4))
      .toString('base64') // convert to base64 format
      .slice(0, len) // return required number of characters
      .replace(/\+/g, '0') // replace '+' with '0'
      .replace(/\//g, '0'); // replace '/' with '0'
  }

  static readJsonFile(path) {
    let data = fs.readFileSync(path, 'utf8');
    return JSON.parse(data);
  }

  static extractPrivateKey(jsonObject) {
    return jsonObject.privateKey;
  }

  static extractPublicKey(jsonObject) {
    return ethCrypto.publicKeyByPrivateKey(jsonObject.privateKey);
  }

  static extractAddress(jsonObject) {
    return web3.utils.toChecksumAddress(jsonObject.address);
  }

  static constructSmartContract(abi, address) {
    return new web3.eth.Contract(abi, address);
  }



  static getPubKeyFromPrivateKey(privateKey) {
    return ethCrypto.publicKeyByPrivateKey(privateKey);
  }

  static hashPayload(payload) {
    return ethCrypto.hash.keccak256(payload);
  }

  static signPayload(payloadHash, sourcePrivateKey) {
    return ethCrypto.sign(sourcePrivateKey, payloadHash);
  }

  static recoverAddress(signature, hash) {
    return ethCrypto.recover(signature, hash);
  }

  static async encryptPayload(payload, destPublicKey) {
    const encryptedPayload = await ethCrypto.encryptWithPublicKey(destPublicKey, payload);
    return ethCrypto.cipher.stringify(encryptedPayload);
  }

  static async decryptPayload(encryptedPayload, privateKey) {
    const encrypted = ethCrypto.cipher.parse(encryptedPayload);
    return await ethCrypto.decryptWithPrivateKey(privateKey, encrypted);
  }

  static encryptSymmetrically(key, data) {
    let cipher = crypto.createCipher(algorithm, key);
    let ciphered = cipher.update(data, inputEncoding, outputEncoding);
    ciphered += cipher.final(outputEncoding);
    return ciphered;
  }

  static decryptSymmetrically(key, ciphered) {
    let decipher = crypto.createDecipher(algorithm, key);
    let deciphered = decipher.update(ciphered, outputEncoding, inputEncoding);
    deciphered += decipher.final(inputEncoding);
    return deciphered;
  }

  static convertStringToByte(string) {
    return web3.utils.fromAscii(string);
  }

  static convertByteToString(byte) {
    return web3.utils.toAscii(byte);
  }
  
  static async sendRequest(options) {
    try {
      return await axios(options);
    } catch (err) {
      return new Error(`Error sending request ${err}`);
    }
  }

  static convertStringToBase64(string) {
    return Buffer.from(string).toString('base64');
  }

  static convertBase64ToString(base64) {
    return Buffer.from(base64, 'base64').toString('ascii')
  }
}

module.exports = Tools;