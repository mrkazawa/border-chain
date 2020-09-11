const cluster = require('cluster');
const os = require('os');
const chalk = require('chalk');
const log = console.log;

const Processor = require('./processor');
const Messenger = require('./messenger');
const SystemDatabase = require('./db/system-db');

const {
  performance
} = require('perf_hooks');

// number of repetitions
const NUMBER_OF_EPOCH = 1000;

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
    const device = await getSystemSharedParameters();

    while (true) {
      const [authHash, auth] = Processor.preparePayload(option, device);
      const authForGateway = {
        authHash: authHash,
        auth: auth,
        authOption: option,
        deviceSignature: device.deviceSignature,
        deviceAddress: device.address,
        vendorAddress: device.vendorAddress,
        vendorPublicKey: device.vendorPublicKey
      };
      // do not send authForGateway

      const epoch = await SystemDatabase.getCurrentEpoch();
      await SystemDatabase.incrementEpoch();

      if (epoch >= NUMBER_OF_EPOCH) break; // done, go out
    }

    process.send('done');
  }
}

async function initiateSystemSharedParameters() {
  try {
    const [device] = await Promise.all([
      Messenger.getDeviceInfo()
    ]);
    const epoch = 0; // start with 0
    await Promise.all([
      SystemDatabase.storeDeviceIdentity(device),
      SystemDatabase.storeEpoch(epoch)
    ]);

  } catch (err) {
    throw new Error(`error when initiating shared system parameters! ${err}`);
  }
}

async function getSystemSharedParameters() {
  const [device] = await Promise.all([
    SystemDatabase.getDeviceIdentity()
  ]);
  if (!device) throw new Error('worker cannot get shared parameters!');

  return device;
}

async function run(option) {
  await runMaster();
  await runWorkers(option);
}

if (process.argv.length !== 3) {
  log(chalk.red('You have to put only one argument in integer: 1 for pksig, 2 for sksig, 3 for fingerprint, and 4 for mac'));
  process.exit(1);

} else {
  if (process.argv[2]) {
    run(parseInt(process.argv[2]));

  } else {
    log(chalk.red('Your argument is invalid'));
    process.exit(1);
  }
}