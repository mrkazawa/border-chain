const autocannon = require('autocannon');
const chalk = require('chalk');

const CryptoUtil = require('../utils/crypto-util');
const HttpUtil = require('../utils/http-util');

const {
  GATEWAY_AUTHN_URL,
  DEVICE_AUTHN_OPTION
} = require('../config');

const isBenchmarking = () => {
  return (process.env.BENCHMARKING == "true");
};

const DEVICE = CryptoUtil.createNewIdentity();

async function assignPayload(option) {
  switch (option) {
    case DEVICE_AUTHN_OPTION.PKE:
      return await constructPublicKeyPayload();

    case DEVICE_AUTHN_OPTION.SKE:
      return constructSecretKeyPayload();

    case DEVICE_AUTHN_OPTION.FINGERPRINT:
      return constructFingerprintPayload();
      
    case DEVICE_AUTHN_OPTION.MAC:
      return constructMacAddressPayload();
  }
}

async function constructPublicKeyPayload(vendor) {
  const auth = {
    deviceSN: '1234-5678-1234-5678',
    timestamp: Date.now(),
    nonce: CryptoUtil.randomValueBase64(64)
  };

  const authHash = CryptoUtil.hashPayload(auth);
  const encrypted = await CryptoUtil.encryptPayload(vendor.publicKey, auth);
  const authSignature = CryptoUtil.signPayload(DEVICE.privateKey, encrypted);
  const payloadForVendor = {
    authPayload: encrypted,
    authSignature: authSignature
  };

  return [authHash, payloadForVendor];
}

function constructSecretKeyPayload(key) {
  const auth = {
    deviceSN: '1234-5678-1234-5678',
    timestamp: Date.now(),
    nonce: CryptoUtil.randomValueBase64(64)
  }

  const authHash = CryptoUtil.hashPayload(auth);
  const encrypted = CryptoUtil.encryptSymmetrically(key, auth);

  return [authHash, encrypted];
}

function constructFingerprintPayload() {
  const auth = {
    deviceSN: '1234-5678-1234-5678',
    fingerprint: 'cf23df2207d99a74fbe169e3eba035e633b65d94', // example of hash of the secret file.
    timestamp: Date.now(),
    nonce: CryptoUtil.randomValueBase64(64)
  }

  const authHash = CryptoUtil.hashPayload(auth);
  return [authHash, auth];
}

function constructMacAddressPayload() {
  const auth = {
    deviceSN: '1234-5678-1234-5678',
    mac: '00-14-22-01-23-45', // example of mac address of device
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
    const result = await HttpUtil.sendAuthPayloadToGateway(payload);
    console.log(result);
  }
}

function benchmark(payload) {
  const instance = constructAutoCannonInstance('End-to-end Device Authentication', GATEWAY_AUTHN_URL, payload);

  autocannon.track(instance, {
    renderProgressBar: true,
    renderResultsTable: false,
    renderLatencyTable: false,
    progressBarString: `Running :percent | Elapsed :elapsed (seconds) | Rate :rate | ETA :eta (seconds)`
  });
  
  instance.on('tick', (counter) => {
    if (counter.counter == 0) {
      console.log(chalk.redBright(`${instance.opts.title} WARN! requests possibly is not being processed`));
    }
  });
  
  instance.on('done', (results) => {
    console.log(chalk.cyan(`${instance.opts.title} Results:`));
    console.log(chalk.cyan(`Avg Tput (Req/sec): ${results.requests.average}`));
    console.log(chalk.cyan(`Avg Lat (ms): ${results.latency.average}`));
  });
  
  // this is used to kill the instance on CTRL-C
  process.on('SIGINT', function() {
    console.log(chalk.bgRed.white('\nGracefully shutting down from SIGINT (Ctrl-C)'));
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
  }, console.log);
}

async function main(option) {
  const [hash, payload] = await assignPayload(option);
  const payloadForGateway = {
    offChainPayload: payload,
    payloadHash: hash,
    authOption: option,
    vendorId: "samsung", // a mock vendor id
    deviceId: DEVICE.address,
    nonce: tools.randomValueBase64(64) // to protect replay at gateway
  }

  await sendAuthPayloadToGateway(payloadForGateway);
}

if (process.argv.length !== 3) {
  console.error('You have to put only one argument in integer: the DEVICE_AUTHN_OPTION!');
  process.exit(1);

} else {
  if (process.argv[2]) {
    main(parseInt(process.argv[2]));

  } else {
    console.error('Your argument is invalid');
    process.exit(1);
  }
}