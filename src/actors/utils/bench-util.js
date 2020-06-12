const autocannon = require('autocannon');
const chalk = require('chalk');
const log = console.log;

class BenchUtil {
  static createPostAutoCannonInstance(title, url, body, connections, overallRate, amount) {
    return autocannon({
      title: title,
      url: url,
      method: 'POST',
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(body),
      connections: connections,
      pipelining: 1,
      bailout: 1000,
      overallRate: overallRate,
      amount: amount,
      duration: 1
    }, log);
  }

  static runBenchmark(instance) {
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
    process.on('SIGINT', function() {
      log(chalk.bgRed.white('\nGracefully shutting down from SIGINT (Ctrl-C)'));
      instance.stop();
      process.exit(0);
    });
  }
}

module.exports = BenchUtil;