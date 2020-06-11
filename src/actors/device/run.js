const autocannon = require('autocannon');
const chalk = require('chalk');
const log = console.log;

const isBenchmarking = () => {
  return (process.env.BENCHMARKING == "true");
};

const CryptoUtil = require('../utils/crypto-util');
const HttpUtil = require('../utils/http-util');

const {
  GATEWAY_AUTHN_URL,
  DEVICE_AUTHN_OPTION
} = require('../config');

const DEVICE = CryptoUtil.createNewIdentity();

async function assignPayload(option, deviceProperties, vendor) {
  switch (option) {
    case DEVICE_AUTHN_OPTION.PKE:
      return await constructPublicKeyPayload(deviceProperties, vendor);

    case DEVICE_AUTHN_OPTION.SKE:
      return constructSecretKeyPayload(deviceProperties);

    case DEVICE_AUTHN_OPTION.FINGERPRINT:
      return constructFingerprintPayload(deviceProperties);

    case DEVICE_AUTHN_OPTION.MAC:
      return constructMacAddressPayload(deviceProperties);
  }
}

async function constructPublicKeyPayload(deviceProperties, vendor) {
  const auth = {
    serialNumber: deviceProperties.serialNumber,
    timestamp: Date.now(),
    nonce: CryptoUtil.randomValueBase64(64)
  };

  const authSignature = CryptoUtil.signPayload(DEVICE.privateKey, auth);
  const authPayload = {
    auth: auth,
    authSignature: authSignature
  }

  const authHash = CryptoUtil.hashPayload(auth);
  const encrypted = await CryptoUtil.encryptPayload(vendor.publicKey, authPayload);
  
  return [authHash, encrypted];
}

function constructSecretKeyPayload(deviceProperties) {
  const auth = {
    serialNumber: deviceProperties.serialNumber,
    timestamp: Date.now(),
    nonce: CryptoUtil.randomValueBase64(64)
  }

  const authHash = CryptoUtil.hashPayload(auth);
  const encrypted = CryptoUtil.encryptSymmetrically(deviceProperties.secretKey, auth);

  return [authHash, encrypted];
}

function constructFingerprintPayload(deviceProperties) {
  const auth = {
    serialNumber: deviceProperties.serialNumber,
    fingerprint: deviceProperties.fingerprint,
    timestamp: Date.now(),
    nonce: CryptoUtil.randomValueBase64(64)
  }
  const authHash = CryptoUtil.hashPayload(auth);

  return [authHash, auth];
}

function constructMacAddressPayload(deviceProperties) {
  const auth = {
    serialNumber: deviceProperties.serialNumber,
    mac: deviceProperties.mac,
    timestamp: Date.now(),
    nonce: CryptoUtil.randomValueBase64(64)
  }
  const authHash = CryptoUtil.hashPayload(auth);

  return [authHash, auth];
}

async function sendAuthPayloadToGateway(payload) {
  if (isBenchmarking()) {
    benchmark(payload);

  } else {
    const result = await HttpUtil.sendAuthenticationPayloadToGateway(payload);
    log(result);
  }
}

function benchmark(payload) {
  const instance = constructAutoCannonInstance('Stress the Gateway Auth Server', GATEWAY_AUTHN_URL, payload);

  autocannon.track(instance, {
    renderProgressBar: true,
    renderResultsTable: false,
    renderLatencyTable: false,
    progressBarString: `Running :percent | Elapsed :elapsed (seconds) | Rate :rate | ETA :eta (seconds)`
  });

  instance.on('tick', (counter) => {
    if (counter.counter == 0) {
      log(chalk.redBright(`${instance.opts.title} WARN! requests possibly is not being processed`));
    }
  });

  instance.on('done', (results) => {
    log(chalk.cyan(`${instance.opts.title} Results:`));
    log(chalk.cyan(`Avg Tput (Req/sec): ${results.requests.average}`));
    log(chalk.cyan(`Avg Lat (ms): ${results.latency.average}`));
  });

  // this is used to kill the instance on CTRL-C
  process.on('SIGINT', function () {
    log(chalk.bgRed.white('\nGracefully shutting down from SIGINT (Ctrl-C)'));
    instance.stop();
  });
}

function constructAutoCannonInstance(title, url, payload) {
  return autocannon({
    title: title,
    url: url,
    method: 'POST',
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      payload: payload
    }),
    connections: 10,
    pipelining: 1,
    bailout: 1000,
    //overallRate: 10, // rate of requests to make per second from all connections
    amount: 100000,
    duration: 1
  }, log);
}

async function prepare() {
  const [registered, deviceProperties, vendor] = await Promise.all([
    HttpUtil.registerDevice(DEVICE.address, DEVICE.publicKey),
    HttpUtil.getDeviceProperties(),
    HttpUtil.getVendorInfo()
  ]);

  log(chalk.yellow(registered));

  return [deviceProperties, vendor];
}

async function main(option) {
  const [deviceProperties, vendor] = await prepare();
  const [authHash, auth] = await assignPayload(option, deviceProperties, vendor);

  const authForGateway = {
    auth: auth,
    authHash: authHash,
    authOption: option,
    vendorId: deviceProperties.vendorId,
    deviceId: DEVICE.address
  }

  await sendAuthPayloadToGateway(authForGateway);
}

if (process.argv.length !== 3) {
  log(chalk.red('You have to put only one argument in integer: the DEVICE_AUTHN_OPTION!'));
  process.exit(1);

} else {
  if (process.argv[2]) {
    main(parseInt(process.argv[2]));

  } else {
    log(chalk.red('Your argument is invalid'));
    process.exit(1);
  }
}