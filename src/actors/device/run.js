const chalk = require('chalk');
const log = console.log;

const CryptoUtil = require('../utils/crypto-util');

const Processor = require('./processor');
const Messenger = require('./messenger');

const {
  DEVICE_PROPERTIES
} = require('./config');

const DEVICE = CryptoUtil.createNewIdentity();

// should the device id is singed by the manufacturer,
// so that we can check if this device really belongs to the manu.

async function prepare() {
  const device = prepareDevice(DEVICE_PROPERTIES, DEVICE.address, DEVICE.publicKey)
  const [registered, vendor] = await Promise.all([
    Messenger.sendDeviceRegistrationToVendor(device),
    Messenger.getVendorInfo()
  ]);

  log(chalk.yellow(registered));

  return [device, vendor];
}

async function main(option) {
  const [device, vendor] = await prepare();
  const [authHash, auth] = await Processor.preparePayload(option, device, vendor);

  Processor.sendAuthPayloadToGateway(authHash, auth, option, device.vendorId, device.address);
}

function prepareDevice(deviceProperties, address, publicKey) {
  deviceProperties.address = address;
  deviceProperties.publicKey = publicKey;

  return deviceProperties;
  /*return {
    vendorId: deviceProperties.vendorId,
    serialNumber: deviceProperties.serialNumber,
    secretKey: deviceProperties.secretKey,
    fingerprint: deviceProperties.fingerprint,
    mac: deviceProperties.mac,
    address: address,
    publicKey: publicKey
  }*/
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