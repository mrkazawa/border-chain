const autocannon = require('autocannon');
const fs = require('fs'); 
const chalk = require('chalk');
const log = console.log;

const FILENAME = 'result.csv';

const SERVER_HOSTNAME = 'actor4.local';
const SERVER_PORT = 3000;
const SERVER_BASE_URL = 'http://' + SERVER_HOSTNAME + ':' + SERVER_PORT;

function assignTargetUrl(option) {
  switch (option) {
    case 1:
      return SERVER_BASE_URL + '/hash';
    case 2:
      return SERVER_BASE_URL + '/pk-sign';
    case 3:
      return SERVER_BASE_URL + '/pk-verify';
    case 4:
      return SERVER_BASE_URL + '/sk-sign';
    case 5:
      return SERVER_BASE_URL + '/sk-verify';
    case 6:
      return SERVER_BASE_URL + '/pk-encrypt';
    case 7:
      return SERVER_BASE_URL + '/pk-decrypt';
    case 8:
      return SERVER_BASE_URL + '/sk-encrypt';
    case 9:
      return SERVER_BASE_URL + '/sk-decrypt';
  }
}

function constructAutoCannonInstance(url) {
  return autocannon({
    title: 'Benchmark the crypto tools!',
    url: url,
    method: 'GET',
    connections: 10,
    pipelining: 1,
    bailout: 1000,
    amount: 0,
    duration: 30
  });
}

function run(option) {
  const targetUrl = assignTargetUrl(option);
  const instance = constructAutoCannonInstance(targetUrl);

  autocannon.track(instance, {
    renderProgressBar: true,
    renderResultsTable: false,
    renderLatencyTable: false
  });

  instance.on('tick', (counter) => {
    if (counter.counter == 0) {
      log(chalk.redBright(`${instance.opts.title} WARN! requests possibly is not being processed`));
    }
  });

  instance.on('done', (results) => {
    log(chalk.cyan(`Avg Tput (Req/sec): ${results.requests.average}`));
    appendResult(results.requests.average);
  });

  // this is used to kill the instance on CTRL-C
  process.on('SIGINT', function () {
    log(chalk.bgRed.white('\nGracefully shutting down from SIGINT (Ctrl-C)'));
    instance.stop();
  });
}

function appendResult(result) {
  const row = result + "\r\n";
  fs.appendFileSync(FILENAME, row);
}

if (process.argv.length !== 3) {
  log(chalk.red('You have to put only one argument in integer'));
  process.exit(1);

} else {
  if (process.argv[2]) {
    run(parseInt(process.argv[2]));

  } else {
    log(chalk.red('Your argument is invalid'));
    process.exit(1);
  }
}