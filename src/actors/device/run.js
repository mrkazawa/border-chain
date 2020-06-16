const chalk = require('chalk');
const log = console.log;

const Processor = require('./processor');
const Messenger = require('./messenger');

async function prepare() {
  const [device, vendor] = await Promise.all([
    Messenger.getDeviceInfo(),
    Messenger.getVendorInfo()
  ]);

  return [device, vendor];
}

async function main(option) {
  const [device, vendor] = await prepare();
  const [authHash, auth] = await Processor.preparePayload(option, device, vendor);

  Processor.sendAuthPayloadToGateway(authHash, auth, option, device.vendorId, device.address);
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