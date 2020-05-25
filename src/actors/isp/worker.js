'use-strict'

const {
  isMainThread,
  parentPort,
  workerData
} = require('worker_threads');

const CryptoUtil = require('../utils/crypto-util');

const EthCrypto = require('eth-crypto');

async function main() {
  if (!isMainThread) {
    console.log(workerData.encrypted);
    console.log(workerData.privateKey);

    const encrypted = EthCrypto.cipher.parse(workerData.encrypted);
    EthCrypto.decryptWithPrivateKey(workerData.privateKey, encrypted).then(function (decrypted) {
      console.log('decrypted is', decrypted);
    });
    

    //const payloadForISP = await CryptoUtil.decryptPayload(workerData.privateKey, workerData.encrypted);
    parentPort.postMessage(JSON.parse(decrypted));
  }
}

main();