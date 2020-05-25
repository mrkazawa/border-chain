const {
  Worker,
  isMainThread,
  parentPort,
  workerData
} = require('worker_threads');

const CryptoUtil = require('./utils/crypto-util');

const OWNER = CryptoUtil.createNewIdentity();

function createAuthenticationPayload() {
  // example of authentication payload for the ISP
  return {
    username: 'john',
    password: 'fish',
    routerIP: '200.100.10.10',
    nonce: CryptoUtil.randomValueBase64(64)
  };
}

async function main() {
  if (isMainThread) {
    // This code is executed in the main thread and not in the worker.

    const auth = createAuthenticationPayload();

    // Create the worker.
    const worker = new Worker(__filename, {
      workerData: { auth }
    });
    // Listen for messages from the worker and print them.
    worker.on('message', (msg) => {
      console.log(msg);
    });

    console.log(`A is main thread? ${isMainThread}`);

  } else {
    // This code is executed in the worker and not in the main thread.

    const authSignature = CryptoUtil.signPayload(OWNER.privateKey, workerData.auth);
    const payloadForISP = {
      authPayload: workerData.auth,
      authSignature: authSignature
    };
    const offChainPayload = await CryptoUtil.encryptPayload(OWNER.publicKey, payloadForISP);
    const decrypted = await CryptoUtil.decryptPayload(OWNER.privateKey, offChainPayload);

    // Send a message to the main thread.
    parentPort.postMessage(decrypted);

    console.log(`B is main thread? ${isMainThread}`);
  }
}

main();