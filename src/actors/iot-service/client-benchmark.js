const cluster = require('cluster');
const os = require('os');
const chalk = require('chalk');
const log = console.log;

const CryptoUtil = require('../utils/crypto-util');
const EthereumUtil = require('../utils/ethereum-util');
const Messenger = require('./messenger');
const PayloadDatabase = require('./db/payload-db');
const SystemDatabase = require('./db/system-db');

const {
  ETH_NETWORK_ID
} = require('./config');

const {
  performance
} = require('perf_hooks');

const CLIENT_OPTION = {
  ACCESS: 1,
  HANDSHAKE: 2,
  RESOURCE: 3
};

// number of repetitions
const NUMBER_OF_EPOCH = 10000;

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

async function runWorkers(option) {
  if (cluster.isWorker) {
    const [service, gateway, abi, chosenAccesses] = await getSystemSharedParameters();

    const contractAddress = abi.networks[ETH_NETWORK_ID].address;
    const contract = EthereumUtil.constructSmartContract(abi.abi, contractAddress);

    if (option == CLIENT_OPTION.ACCESS) {
      while (true) {
        const nonce = await SystemDatabase.getCurrentTxNonce();
        await processAccessAuthorization(chosenAccesses, service, gateway, nonce, contractAddress, contract);
        await SystemDatabase.incrementTxNonce();

        if (nonce >= NUMBER_OF_EPOCH) break; // done, go out
      }

    } else if (option == CLIENT_OPTION.HANDSHAKE) {
      const nonce = await SystemDatabase.getCurrentTxNonce();
      const authHash = await processAccessAuthorization(chosenAccesses, service, gateway, nonce, contractAddress, contract);
      await SystemDatabase.incrementTxNonce();

      const handshakeNonce = CryptoUtil.randomValueBase64(64);
      const mockResponse = await createGatewayMockResponse(handshakeNonce, gateway, service);
      let epoch = 0;
      while (true) {
        await processHandshake(authHash, service, gateway, handshakeNonce, mockResponse);
        epoch++;

        if (epoch >= NUMBER_OF_EPOCH) break; // done, go out
      }

    } else if (option == CLIENT_OPTION.RESOURCE) {

    } else {
      throw new Error('invalid option!');
    }

    process.send('done');
  }
}

async function processAccessAuthorization(chosenAccesses, service, gateway, nonce, contractAddress, contract) {
  const auth = constructAuthorizationPayload(chosenAccesses);
  const authHash = CryptoUtil.hashPayload(auth);

  const storeAuth = contract.methods.storePayload(authHash, service.address, gateway.address).encodeABI();

  const storeAuthTx = {
    from: service.address,
    to: contractAddress,
    nonce: nonce,
    gasLimit: 5000000,
    gasPrice: 5000000000,
    data: storeAuth
  };

  const signedStoreAuthTx = CryptoUtil.signTransaction(service.privateKey, storeAuthTx);
  // do not send signedStoreAuthTx

  await PayloadDatabase.storeNewPayload(authHash, service.address, service.address, gateway.address);
  // bypass blockchain network,
  // we assume that the payload is directly stored
  await PayloadDatabase.updatePayloadStateToStored(authHash);

  const payloadSignature = CryptoUtil.signPayload(service.privateKey, auth);
  const payloadForGateway = {
    payload: auth,
    payloadSignature: payloadSignature
  };
  const offChainPayload = await CryptoUtil.encryptPayload(gateway.publicKey, payloadForGateway);
  // do not send offChainPayload

  return authHash;
}

async function createGatewayMockResponse(handshakeNonce, gateway, service) {
  const exchange = {
    timestamp: Date.now(),
    nonce: handshakeNonce,
    secret: CryptoUtil.randomValueBase64(128)
  };

  const exchangeSignature = CryptoUtil.signPayload(gateway.privateKey, exchange);
  const payloadForService = {
    payload: exchange,
    payloadSignature: exchangeSignature
  };
  const response = await CryptoUtil.encryptPayload(service.publicKey, payloadForService);

  return response;
}

async function processHandshake(payloadHash, service, gateway, handshakeNonce, mockResponse) {
  const exchange = {
    token: payloadHash,
    publicKey: service.publicKey,
    timestamp: Date.now(),
    nonce: handshakeNonce,
    secret: CryptoUtil.randomValueBase64(128)
  };

  const exchangeSignature = CryptoUtil.signPayload(service.privateKey, exchange);
  const payloadForGateway = {
    payload: exchange,
    payloadSignature: exchangeSignature
  };
  const requestForGateway = await CryptoUtil.encryptPayload(gateway.publicKey, payloadForGateway);

  // do not send requestForGateway
  // we assume that the gateway send the mock response here
  const responseDecrypted = await CryptoUtil.decryptPayload(service.privateKey, mockResponse);
  const responsePayload = responseDecrypted.payload;
  const responseSignature = responseDecrypted.payloadSignature;

  if (exchange.nonce != responsePayload.nonce) throw new Error('exchange error: invalid nonce from gateway');

  const isValid = CryptoUtil.verifyPayload(responseSignature, responsePayload, gateway.address);
  if (!isValid) throw new Error('exchange error: invalid signature from gateway');

  const secretKey = exchange.secret + responsePayload.secret;
}

function constructAuthorizationPayload(accesses) {
  return {
    accesses: accesses,
    timestamp: Date.now(),
    nonce: CryptoUtil.randomValueBase64(64)
  }
}

async function initiateSystemSharedParameters() {
  try {
    const service = CryptoUtil.createNewIdentity();

    const [assigned, abi, gateway, responses, currentTxNonce] = await Promise.all([
      Messenger.seedEtherToService(service.address),
      Messenger.getContractAbi(),
      Messenger.getGatewayInfo(),
      Messenger.getAccessList(service.address),
      EthereumUtil.getTransactionCount(service.address)
    ]);

    log(chalk.yellow(assigned));

    const accesses = responses.accesses;
    const accessesSignature = responses.accessesSignature;
    const isValid = CryptoUtil.verifyPayload(accessesSignature, accesses, gateway.address);
    if (!isValid) throw new Error('accesses signature is invalid!');

    const chosenAccesses = accesses.slice(0, 2); // we choose the first two accesses

    await Promise.all([
      SystemDatabase.storeServiceIdentity(service),
      SystemDatabase.storeGatewayIdentity(gateway),
      SystemDatabase.storeContractAbi(abi),
      SystemDatabase.storeTxNonce(currentTxNonce),
      SystemDatabase.storeAccesses(chosenAccesses)
    ]);

  } catch (err) {
    throw new Error(`error when initiating shared system parameters! ${err}`);
  }
}

async function getSystemSharedParameters() {
  const [service, gateway, abi, chosenAccesses] = await Promise.all([
    SystemDatabase.getServiceIdentity(),
    SystemDatabase.getGatewayIdentity(),
    SystemDatabase.getContractAbi(),
    SystemDatabase.getAccesses()
  ]);

  if (!service || !gateway || !abi || !chosenAccesses) throw new Error('worker cannot get shared parameters!');

  return [service, gateway, abi, chosenAccesses];
}

async function run(option) {
  await runMaster();
  await runWorkers(option);
}

if (process.argv.length !== 3) {
  log(chalk.red('You have to put only one argument in integer: 1 for access, 2 for handshake, and 3 for resource'));
  process.exit(1);

} else {
  if (process.argv[2]) {
    run(parseInt(process.argv[2]));

  } else {
    log(chalk.red('Your argument is invalid'));
    process.exit(1);
  }
}