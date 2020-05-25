const workerFarm = require('worker-farm');

const FARM_OPTIONS = {
  maxConcurrentWorkers: require('os').cpus().length,
  maxCallsPerWorker: Infinity,
  maxConcurrentCallsPerWorker: 1
};

const workers = workerFarm(FARM_OPTIONS, require.resolve('./child'), [
  'signPayload',
  'encryptPayload',
  'decryptPayload'
]);

const {
  performance
} = require('perf_hooks');

const CryptoUtil = require('../../actors/utils/crypto-util');

const OWNER = CryptoUtil.createNewIdentity();
const EPOCH = 10000;

function createAuthenticationPayload() {
  // example of authentication payload for the ISP
  return {
    username: 'john',
    password: 'fish',
    routerIP: '200.100.10.10',
    nonce: CryptoUtil.randomValueBase64(64)
  };
}

function multi() {
  console.log(`Running in ${require('os').cpus().length} threads...`);

  let counter = 0;
  const start = performance.now();

  for (let i = 0; i < EPOCH; i++) {
    const auth = createAuthenticationPayload();

    workers.encryptPayload(OWNER.publicKey, auth, function (err, encrypted) {
      workers.decryptPayload(OWNER.privateKey, encrypted, function (err, decrypted) {
        //console.log(decrypted);

        if (++counter == EPOCH) {
          const end = performance.now();
          workerFarm.end(workers);
          console.log(`Multi end in: ${end - start} milliseconds`);
        }
      });
    });
  }
}

multi();