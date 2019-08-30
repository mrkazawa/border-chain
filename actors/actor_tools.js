const EthCrypto = require('eth-crypto');
const crypto = require('crypto');
const fs = require('fs');
const Web3 = require('web3');

// the path to the preloaded info from ganache network
const ownerPath = './ganache_files/owner.json';
const ISPPath = './ganache_files/isp.json';
const gatewayPath = './ganache_files/gateway.json';
const contractPath = './ganache_files/contract.json';
const contractABIPath = '../build/contracts/RegistryContract.json';

// the endpoints
const ISPAuthEndpoint = 'http://localhost:3000/authenticate';
const vendorAuthEndpoint = 'http://localhost:4000/authenticate';

// for symmetric encryption and decryption
const algorithm = 'aes256';
const inputEncoding = 'utf8';
const outputEncoding = 'hex';

// connect to ganache network
// run the following command to activate ganache
// ganache-cli -m dongseo
const web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'));

var self = module.exports = {
    /**
     * Generate random string in Base64 form.
     * @param {int} len     the length of the string.
     */
    randomValueBase64: function (len) {
        return crypto
          .randomBytes(Math.ceil((len * 3) / 4))
          .toString('base64') // convert to base64 format
          .slice(0, len) // return required number of characters
          .replace(/\+/g, '0') // replace '+' with '0'
          .replace(/\//g, '0') // replace '/' with '0'
    },
    /**
     * Read JSON file and return the contents of the file in object.
     * Also convert the address of Ethereum (if any) to checksum format.
     * @param {string} path     path to the JSON file.
     */
    readFile: function (path) {
        let data = fs.readFileSync(path, 'utf8');
        return JSON.parse(data);
    },
    /**
     * Get owner private key from ganache configuration.
     */
    getOwnerPrivateKey: function () {
        let obj = self.readFile(ownerPath);
        return obj.privateKey;
    },
    /**
     * Get owner public key from ganache configuration.
     */
    getOwnerPublicKey: function () {
        let obj = self.readFile(ownerPath);
        return EthCrypto.publicKeyByPrivateKey(obj.privateKey);
    },
    /**
     * Get owner address from ganache configuration.
     */
    getOwnerAddress: function() {
        let obj = self.readFile(ownerPath);
        return web3.utils.toChecksumAddress(obj.address);
    },
    /**
     * Get ISP private key from ganache configuration.
     */
    getISPPrivateKey: function () {
        let obj = self.readFile(ISPPath);
        return obj.privateKey;
    },
    /**
     * Get ISP public key from ganache configuration.
     */
    getISPPublicKey: function () {
        let obj = self.readFile(ISPPath);
        return EthCrypto.publicKeyByPrivateKey(obj.privateKey);
    },
    /**
     * Get ISP address from ganache configuration.
     */
    getISPAddress: function() {
        let obj = self.readFile(ISPPath);
        return web3.utils.toChecksumAddress(obj.address);
    },
    /**
     * Get gateway private key from ganache configuration.
     */
    getGatewayPrivateKey: function () {
        let obj = self.readFile(gatewayPath);
        return obj.privateKey;
    },
    /**
     * Get gateway public key from ganache configuration.
     */
    getGatewayPublicKey: function () {
        let obj = self.readFile(gatewayPath);
        return EthCrypto.publicKeyByPrivateKey(obj.privateKey);
    },
    /**
     * Get gateway address from ganache configuration.
     */
    getGatewayAddress: function() {
        let obj = self.readFile(gatewayPath);
        return web3.utils.toChecksumAddress(obj.address);
    },
    /**
     * Get contract address from ganache after 'truffle deploy'.
     */
    getContractAddress: function () {
        let obj = self.readFile(contractPath);
        return web3.utils.toChecksumAddress(obj.address);
    },
    /**
     * Parsing the local contract ABI from truffle.
     * in live network, the ABI can be queried from etherscan.io
     */
    getContractABI: function () {
        let obj = self.readFile(contractABIPath);
        return obj.abi;
    },
    /**
     * Get the endpoint URL to authenticate the gateway.
     */
    getISPAuthEndpoint: function () {
        return ISPAuthEndpoint;
    },
    /**
     * Get the endpoint URL to authenticate the device.
     */
    getVendorAuthEndpoint: function () {
        return vendorAuthEndpoint;
    },
    /**
     * Construct a web3 object of the smart contract.
     * @param {string} abi       the ABI of the contract.
     * @param {string} address   the address of the deployed contract.
     */
    constructSmartContract: function (abi, address) {
        return new web3.eth.Contract(abi, address);
    },
    /**
     * Hash the payload.
     * @param {string} payload  the payload to be hashed.
     */
    hashPayload: function (payload) {
        return EthCrypto.hash.keccak256(payload);
    },
    /**
     * Encrypt the payload with destination public key.
     * Hash the encrypted payload.
     * Then, sign the message with the source private key.
     * @param {string} payload          Payload to be encrypted and signed.
     * @param {hex} destPublicKey       Key used to encrypt.
     * @param {hex} sourcePrivateKey    Key used to sign.
     */
    encryptAndSignPayload: async function (payload, destPublicKey, sourcePrivateKey) {
        const authEncrypted = await EthCrypto.encryptWithPublicKey(destPublicKey, payload);
        const authEncryptedPayload = EthCrypto.cipher.stringify(authEncrypted);
        const authPayloadHash = self.hashPayload(authEncryptedPayload);
        const authSignature = EthCrypto.sign(sourcePrivateKey, authPayloadHash);
        return [authPayloadHash, authSignature, authEncryptedPayload];
    },
    /**
     * Recover the ethereum address from given signature.
     * @param {string} signature    the signature.
     * @param {string} hash         the hash pf the payload tied to the signature.
     */
    recoverAddress: function (signature, hash) {
        return EthCrypto.recover(signature, hash);
    },
    /**
     * Decrypt payload using source private key.
     * @param {string} encryptedPayload the encrypted payload to be decrypted.
     * @param {hex} privateKey          the key used to decrypt.
     */
    decryptPayload: async function (encryptedPayload, privateKey) {
        const encrypted = EthCrypto.cipher.parse(encryptedPayload);
        return await EthCrypto.decryptWithPrivateKey(privateKey, encrypted);
    },
    /**
     * Encrypt the message using symmetric encryption.
     * @param {hex} key         Key used to encrypt.
     * @param {string} data     Payload to be encrypted.
     */
    encryptSymmetrically(key, data) {
        let cipher = crypto.createCipher(algorithm, key);
        let ciphered = cipher.update(data, inputEncoding, outputEncoding);
        ciphered += cipher.final(outputEncoding);
        return ciphered;
    },
    /**
     * Decrypt the message using symmetric encryption.
     * @param {hex} key             Key used to decrypt.
     * @param {string} ciphered     Payload to be decrypted.
     */
    decryptSymmetrically(key, ciphered) {
        let decipher = crypto.createDecipher(algorithm, key);
        let deciphered = decipher.update(ciphered, outputEncoding, inputEncoding);
        deciphered += decipher.final(inputEncoding);
        return deciphered;
    }
}