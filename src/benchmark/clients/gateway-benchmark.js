const cluster = require('cluster');
const os = require('os');
const chalk = require('chalk');
const log = console.log;

const CryptoUtil = require('../../actors/utils/crypto-util');
const EthereumUtil = require('../../actors/utils/ethereum-util');
const Messenger = require('../../actors/gateway/messenger');
const PayloadDatabase = require('../../actors/gateway/db/payload-db');
const SystemDatabase = require('../../actors/gateway/db/system-db');

const {
  ETH_NETWORK_ID
} = require('../../actors/gateway/config');

const {
  performance
} = require('perf_hooks');

// number of repetitions
const NUMBER_OF_EPOCH = 100000;

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
    const [devicePayload, gateway, abi] = await getSystemSharedParameters();

    const contractAddress = abi.networks[ETH_NETWORK_ID].address;
    const contract = EthereumUtil.constructSmartContract(abi.abi, contractAddress);

    while (true) {
      const payloadHash = devicePayload.authHash;
      const auth = devicePayload.auth;
      const authOption = devicePayload.authOption;
      const deviceSignature = devicePayload.deviceSignature;
      const vendorAddress = devicePayload.vendorAddress;
      const vendorPublicKey = devicePayload.vendorPublicKey;
      const deviceAddress = devicePayload.deviceAddress;

      const isValid = CryptoUtil.verifyPayload(deviceSignature, deviceAddress, vendorAddress);
      if (!isValid) return res.status(401).send('the device signature is invalid!');

      await PayloadDatabase.storeNewPayload(auth, payloadHash, authOption, deviceSignature, vendorAddress, vendorPublicKey, deviceAddress);

      const storeAuth = contract.methods.storePayload(payloadHash, deviceAddress, vendorAddress).encodeABI();
      const nonce = await SystemDatabase.getCurrentTxNonce();
  
      const storeAuthTx = {
        from: gateway.address,
        to: contractAddress,
        nonce: nonce,
        gasLimit: 5000000,
        gasPrice: 5000000000,
        data: storeAuth
      };
  
      const signedStoreAuthTx = CryptoUtil.signTransaction(gateway.privateKey, storeAuthTx);
      await SystemDatabase.incrementTxNonce();
      // do not send signedStoreAuthTx

      // bypass blockchain network,
      // we assume that the payload is directly stored
      await PayloadDatabase.updatePayloadStateToStored(payloadHash, gateway.address,deviceAddress, vendorAddress);

      const storedPayload = await PayloadDatabase.getPayload(payloadHash);
      const strippedPayload = {
        authOption: storedPayload.authOption,
        auth: storedPayload.auth,
        deviceSignature: storedPayload.deviceSignature
      };

      const payloadSignature = CryptoUtil.signPayload(gateway.privateKey, strippedPayload);
      const payloadForVendor = {
        payload: strippedPayload,
        payloadSignature: payloadSignature
      };
      const offChainPayload = await CryptoUtil.encryptPayload(storedPayload.vendorPublicKey, payloadForVendor);
      // do not send offChainPayload

      if (nonce >= NUMBER_OF_EPOCH) break; // done, go out
    }

    process.send('done');
  }
}

async function initiateSystemSharedParameters() {
  try {
    const [device, gateway, abi] = await Promise.all([
      Messenger.getDeviceInfo(),
      Messenger.getGatewayInfo(),
      Messenger.getContractAbi()
    ]);
  
    const [assigned, currentTxNonce] =  await Promise.all([
      Messenger.seedEtherToGateway(gateway.address),
      EthereumUtil.getTransactionCount(gateway.address)
    ]);
    log(chalk.yellow(assigned));

    const [authHash, authPayload] = createMockedDevicePayload(device);
    const devicePayload = createMockedGatewayPayload(authHash, authPayload, device);
  
    await Promise.all([
      SystemDatabase.storeDevicePayload(devicePayload),
      SystemDatabase.storeGatewayIdentity(gateway),
      SystemDatabase.storeContractAbi(abi),
      SystemDatabase.storeTxNonce(currentTxNonce)
    ]);

  } catch (err) {
    throw new Error(`error when initiating shared system parameters! ${err}`);
  }
}

async function getSystemSharedParameters() {
  const [devicePayload, gateway, abi] = await Promise.all([
    SystemDatabase.getDevicePayload(),
    SystemDatabase.getGatewayIdentity(),
    SystemDatabase.getContractAbi()
  ]);

  if (!devicePayload || !gateway || !abi) throw new Error('worker cannot get shared parameters!');

  return [devicePayload, gateway, abi];
}

function createMockedDevicePayload(device) {
  const auth = {
    timestamp: Date.now(),
    nonce: CryptoUtil.randomValueBase64(64)
  };

  const authSignature = CryptoUtil.signPayload(device.privateKey, auth);
  const authHash = CryptoUtil.hashPayload(auth);
  const authPayload = {
    auth: auth,
    authSignature: authSignature
  };

  return [authHash, authPayload];
}

function createMockedGatewayPayload(authHash, auth, device) {
  return {
    authHash: authHash,
    auth: auth,
    authOption: 1, // use PKSIG
    deviceSignature: device.deviceSignature,
    deviceAddress: device.address,
    vendorAddress: device.vendorAddress,
    vendorPublicKey: device.vendorPublicKey
  };
}

async function run() {
  await runMaster();
  await runWorkers();
}

run();