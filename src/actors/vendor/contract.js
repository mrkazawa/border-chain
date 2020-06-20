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

  addNewPayloadAddedEventListener(vendor) {
    this.contract.events.NewPayloadAdded({
      fromBlock: 0
    }, async function (error, event) {
      if (error) log(chalk.red(error));
  
      const sender = event.returnValues['sender'];
      const payloadHash = event.returnValues['payloadHash'];
      const target = event.returnValues['target'];
      const verifier = event.returnValues['verifier'];
  
      if (verifier == vendor.address) {
        log(chalk.yellow(`Receiving ${payloadHash} payload`));

        Processor.processNewPayloadAddedEvent(payloadHash, sender, target);
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

      if (sender == vendor.address) {
        log(chalk.yellow(`Verified payload ${payloadHash}`));

        Processor.processDeviceVerifiedEvent(payloadHash);
      }
    });
  }

  async verifyAuthNDevice(authHash, vendor, txNonce) {
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