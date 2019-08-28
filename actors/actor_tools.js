const crypto = require('crypto');

const algorithm = 'aes256';
const inputEncoding = 'utf8';
const outputEncoding = 'hex';

module.exports = {
    /**
     * Generate random string in Base64 form.
     * @param {*} len the length of the string
     */
    randomValueBase64(len) {
        return crypto
          .randomBytes(Math.ceil((len * 3) / 4))
          .toString('base64') // convert to base64 format
          .slice(0, len) // return required number of characters
          .replace(/\+/g, '0') // replace '+' with '0'
          .replace(/\//g, '0') // replace '/' with '0'
    },

    encryptSymmetrically(key, data) {
        let cipher = crypto.createCipher(algorithm, key);
        let ciphered = cipher.update(data, inputEncoding, outputEncoding);
        ciphered += cipher.final(outputEncoding);
        return ciphered;
    },

    decryptSymmetrically(key, ciphered) {
        let decipher = crypto.createDecipher(algorithm, key);
        let deciphered = decipher.update(ciphered, outputEncoding, inputEncoding);
        deciphered += decipher.final(inputEncoding);
        return deciphered;
    }
}