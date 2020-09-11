/*
Unit test for ETH-CRYPTO Library
https://github.com/pubkey/eth-crypto
*/

const EthCrypto = require('eth-crypto');

const PRIVATE_KEY = '0x4c0883a69102937d6231471b5dbb6204fe5129617082792ae468d01a3f362318';
const ADDRESS = '0x2c7536E3605D9C16a7a3D7b1898e529396a65c23';

const PUBLIC_KEY = '4e3b81af9c2234cad09d679ce6035ed1392347ce64ce405f5dcd36228a25de6e47fd35c4215d1edf53e6f83de344615ce719bdb0fd878f6ed76f06dd277956de';
const COMPRESSED_PUBLIC_KEY = '024e3b81af9c2234cad09d679ce6035ed1392347ce64ce405f5dcd36228a25de6e';

describe('Unit tests for crypto ETH-CRYPTO module', function () {
  it('should able to create identity', async () => {
    const identity = EthCrypto.createIdentity();
    assert.isNotEmpty(identity.address);
    assert.isNotEmpty(identity.privateKey);
    assert.isNotEmpty(identity.publicKey);
  });

  it('should able to generate public key from private key', async () => {
    const pub = EthCrypto.publicKeyByPrivateKey(PRIVATE_KEY);
    assert.equal(pub, PUBLIC_KEY);
  });

  it('should able to generate address from public key', async () => {
    const addr = EthCrypto.publicKey.toAddress(PUBLIC_KEY);
    assert.equal(addr, ADDRESS);
  });

  it('should able to compress the public key', async () => {
    const addr = EthCrypto.publicKey.compress(PUBLIC_KEY);
    assert.equal(addr, COMPRESSED_PUBLIC_KEY);
  });

  it('should able to decompress the public key', async () => {
    const addr = EthCrypto.publicKey.decompress(COMPRESSED_PUBLIC_KEY);
    assert.equal(addr, PUBLIC_KEY);
  });

  it('should able to sign the message', async () => {
    const message = 'foobar';
    const messageHash = EthCrypto.hash.keccak256(message);
    const signature = EthCrypto.sign(PRIVATE_KEY, messageHash);
    assert.isNotEmpty(signature);
  });

  it('should able to verify the signer address', async () => {
    const message = 'foobar';
    const messageHash = EthCrypto.hash.keccak256(message);
    const signature = EthCrypto.sign(PRIVATE_KEY, messageHash);
    const signer = EthCrypto.recover(signature, messageHash);
    assert.equal(signer, ADDRESS);
  });

  it('should able to verify the signer public key', async () => {
    const message = 'foobar';
    const messageHash = EthCrypto.hash.keccak256(message);
    const signature = EthCrypto.sign(PRIVATE_KEY, messageHash);
    const signer = EthCrypto.recoverPublicKey(signature, messageHash);
    assert.equal(signer, PUBLIC_KEY);
  });

  it('should able to encrypt with public key', async () => {
    // asynchronous method
    const message = 'foobar';
    const encrypted = await EthCrypto.encryptWithPublicKey(PUBLIC_KEY, message);
    assert.isNotEmpty(encrypted.iv);
    assert.isNotEmpty(encrypted.ephemPublicKey);
    assert.isNotEmpty(encrypted.ciphertext);
    assert.isNotEmpty(encrypted.mac);
  });

  it('should able to decrypt with private key', async () => {
    // asynchronous method
    const message = 'foobar';
    const encrypted = await EthCrypto.encryptWithPublicKey(PUBLIC_KEY, message);
    const msg = await EthCrypto.decryptWithPrivateKey(
      PRIVATE_KEY, {
        iv: encrypted.iv,
        ephemPublicKey: encrypted.ephemPublicKey,
        ciphertext: encrypted.ciphertext,
        mac: encrypted.mac
      }
    );
    assert.equal(msg, message);
  });

  it('should able to convert encrypted object to string', async () => {
    const message = 'foobar';
    const encrypted = await EthCrypto.encryptWithPublicKey(PUBLIC_KEY, message);
    const str = EthCrypto.cipher.stringify(encrypted);
    assert.isNotEmpty(str);
  });

  it('should able to convert string back to encrypted object', async () => {
    const message = 'foobar';
    const encrypted = await EthCrypto.encryptWithPublicKey(PUBLIC_KEY, message);
    const str = EthCrypto.cipher.stringify(encrypted);
    const object = EthCrypto.cipher.parse(str);
    assert.equal(object.iv, encrypted.iv);
    assert.equal(object.ephemPublicKey, encrypted.ephemPublicKey);
    assert.equal(object.ciphertext, encrypted.ciphertext);
    assert.equal(object.mac, encrypted.mac);
  });
});