const autocannon = require('autocannon');
const chalk = require('chalk');

const CryptoUtil = require('../../actors/utils/crypto-util');

const OWNER = CryptoUtil.createNewIdentity();

const SERVER_URL = 'http://actor4.local:5000/'

function createAuthenticationPayload() {
  return {
    username: 'john',
    password: 'fish',
    routerIP: '200.100.10.10',
    nonce: CryptoUtil.randomValueBase64(64)
  };
}

async function sendAuthPayloadToServer(auth) {
  const authSignature = CryptoUtil.signPayload(OWNER.privateKey, auth);
  const payloadForServer = {
    authPayload: auth,
    authSignature: authSignature
  };
  const offChainPayload = await CryptoUtil.encryptPayload(OWNER.publicKey, payloadForServer);

  benchmark(offChainPayload);
}

function benchmark(payload) {
  const instance = constructAutoCannonInstance('Bench the server!', SERVER_URL, payload);

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
      privateKey: OWNER.privateKey,
      address: OWNER.address,
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

async function main() {
  const auth = createAuthenticationPayload();
  await sendAuthPayloadToServer(auth);
}

main();