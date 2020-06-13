const chalk = require('chalk');
const log = console.log;

const isBenchmarking = () => {
  return (process.env.BENCHMARKING == "true");
};

const EthereumUtil = require('../utils/ethereum-util');
const CryptoUtil = require('../utils/crypto-util');
const Processor = require('./processor');

const {
  ETH_NETWORK_ID
} = require('./config');

class Contract {
  constructor(abi) {
    if ('instance' in this.constructor) {
      return this.constructor.instance;
    }

    this.constructor.instance = this;

    this.contractAddress = abi.networks[ETH_NETWORK_ID].address;
    this.contract = EthereumUtil.constructSmartContract(abi.abi, this.contractAddress);
  }

  addStoredPayloadEventListener(vendor) {
    this.contract.events.NewPayloadAdded({
      fromBlock: 0
    }, async function (error, event) {
      if (error) log(chalk.red(error));
  
      const sender = event.returnValues['sender'];
      const payloadHash = event.returnValues['payloadHash'];
      const verifier = event.returnValues['verifier'];
  
      if (verifier == vendor.address) {
        log(`Receiving ${payloadHash} payload`);

        Processor.processStoredPayload(payloadHash, sender);
      }
    });
  }

  addDeviceVerifiedEventListener(vendor) {
    this.contract.events.DeviceVerified({
      fromBlock: 0
    }, function (error, event) {
      if (error) log(chalk.red(error));

      const sender = event.returnValues['sender'];
      const payloadHash = event.returnValues['payloadHash'];
      const gateway = event.returnValues['gateway'];
      const device = event.returnValues['device'];

      if (sender == vendor.address) {
        log(chalk.yellow(`Verified payload ${payloadHash}`));

        Processor.processVerifiedPayload(payloadHash, gateway, device);
      }
    });
  }

  async validateAuthPayload(authHash, vendor, txNonce) {
    const validateAuth = this.contract.methods.verifyAuthNDevice(authHash).encodeABI();
    const validateAuthTx = {
      from: vendor.address,
      to: this.contractAddress,
      nonce: txNonce,
      gasLimit: 5000000,
      gasPrice: 5000000000,
      data: validateAuth
    };
  
    const signedTx = CryptoUtil.signTransaction(vendor.privateKey, validateAuthTx);
    if (!isBenchmarking()) EthereumUtil.sendTransaction(signedTx);
  }
}

module.exports = Contract;