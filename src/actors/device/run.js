const chalk = require('chalk');
const log = console.log;

const Processor = require('./processor');
const Messenger = require('./messenger');

async function main(option) {
  const device = await Messenger.getDeviceInfo();
  if (!device) throw new Error('cannot get device properties');

  const [authHash, auth] = await Processor.preparePayload(option, device);
  Processor.sendAuthPayloadToGateway(authHash, auth, option, device);
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