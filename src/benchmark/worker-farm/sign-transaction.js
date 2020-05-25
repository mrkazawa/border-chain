const {
  NUMBER_OF_REPEAT,
  OPERATION
} = require('../bench-tools');

const {
  run
} = require('./run-operation');

async function start() {
  console.log(`Running in ${require('os').cpus().length} threads...`);

  for (let j = 0; j < NUMBER_OF_REPEAT; j++) {
    console.log(`Running #${j} ...`);

    await run(OPERATION.SIGN_TRANSACTION);
  }
}

start();