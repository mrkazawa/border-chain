const cluster = require('cluster');
const os = require('os');
const chalk = require('chalk');
const log = console.log;

const CryptoUtil = require('../utils/crypto-util');
const EthereumUtil = require('../utils/ethereum-util');
const Messenger = require('./messenger');
const PayloadDatabase = require('./db/payload_db');
const SystemDatabase = require('./db/system_db');

const {
  ETH_NETWORK_ID
} = require('./config');

const {
  performance
} = require('perf_hooks');

// number of repetitions
const NUMBER_OF_EPOCH = 50000;

async function runMaster() {
  if (cluster.isMaster) {
    const numWorkers = os.cpus().length;
    log(`Setting up ${numWorkers} workers...`);

    const start = performance.now();
    let done = 0;

    for (let i = 0; i < numWorkers; i += 1) {
      const worker = cluster.fork();

      worker.on('message', msg => {
        if (msg == 'done') done++;
        if (done >= numWorkers) {
          const end = performance.now();
          const elapsed = end - start;
          log(`ends in ${elapsed} milliseconds`);
        
          const opsPerSecond = NUMBER_OF_EPOCH / elapsed * 1000;
          log(`${opsPerSecond} operations per second`);

          done = 0;
        }
      });
    }

    cluster.on('online', function (worker) {
      log(chalk.green(`Worker ${worker.process.pid} is online`));
    });

    cluster.on('exit', function (worker, code, signal) {
      log(chalk.red(`Worker ${worker.process.pid} died with code: ${code}, and signal: ${signal}`));
      log(`Starting a new worker`);
      cluster.fork();
    });

    await initiateSystemSharedParameters();
  }
}

async function runWorkers() {
  if (cluster.isWorker) {
    const [owner, gateway, isp, abi] = await getSystemSharedParameters();

    const contractAddress = abi.networks[ETH_NETWORK_ID].address;
    const contract = EthereumUtil.constructSmartContract(abi.abi, contractAddress);

    while (true) {
      const auth = {
        username: owner.username,
        password: owner.password,
        routerIp: owner.routerIp,
        timestamp: Date.now(),
        nonce: CryptoUtil.randomValueBase64(64)
      };
      const authHash = CryptoUtil.hashPayload(auth);

      const storeAuth = contract.methods.storePayload(authHash, gateway.address, isp.address).encodeABI();
      const nonce = await SystemDatabase.getCurrentTxNonce();
  
      const storeAuthTx = {
        from: owner.address,
        to: contractAddress,
        nonce: nonce,
        gasLimit: 5000000,
        gasPrice: 5000000000,
        data: storeAuth
      };
  
      const signedStoreAuthTx = CryptoUtil.signTransaction(owner.privateKey, storeAuthTx);
      await SystemDatabase.incrementTxNonce();
      // do not send signedStoreAuthTx
  
      await PayloadDatabase.storeNewPayload(authHash, owner.address, gateway.address, isp.address);
      // bypass blockchain network,
      // we assume that the payload is directly stored
      await PayloadDatabase.updatePayloadStateToStored(authHash);
  
      const payloadSignature = CryptoUtil.signPayload(owner.privateKey, auth);
      const payloadForIsp = {
        payload: auth,
        payloadSignature: payloadSignature
      };
      const offChainPayload = await CryptoUtil.encryptPayload(isp.publicKey, payloadForIsp);
      // do not send offChainPayload

      if (nonce >= NUMBER_OF_EPOCH) break; // done, go out
    }

    process.send('done');
  }
}

async function initiateSystemSharedParameters() {
  try {
    const owner = CryptoUtil.createNewIdentity();
    const gateway = CryptoUtil.createNewIdentity();
    const creds = createDomainOwnerCredential();

    const [assigned, abi, isp, currentTxNonce] = await Promise.all([
      Messenger.seedEtherToOwner(owner.address),
      Messenger.getContractAbi(),
      Messenger.sendUserRegistrationToIsp(owner.address, creds.username, creds.password),
      EthereumUtil.getTransactionCount(owner.address)
    ]);

    log(chalk.yellow(assigned));
    
    await Promise.all([
      SystemDatabase.storeOwnerIdentity(owner, creds),
      SystemDatabase.storeGatewayIdentity(gateway),
      SystemDatabase.storeIspIdentity(isp),
      SystemDatabase.storeContractAbi(abi),
      SystemDatabase.storeTxNonce(currentTxNonce)
    ]);

  } catch (err) {
    throw new Error(`error when initiating shared system parameters! ${err}`);
  }
}

async function getSystemSharedParameters() {
  const [owner, gateway, isp, abi] = await Promise.all([
    SystemDatabase.getOwnerIdentity(),
    SystemDatabase.getGatewayIdentity(),
    SystemDatabase.getIspIdentity(),
    SystemDatabase.getContractAbi()
  ]);

  if (!owner || !gateway || !isp || !abi) throw new Error('worker cannot get shared parameters!');

  return [owner, gateway, isp, abi];
}

function createDomainOwnerCredential() {
  return {
    username: 'john',
    password: 'fish'
  };
}

async function run() {
  await runMaster();
  await runWorkers();
}

run();