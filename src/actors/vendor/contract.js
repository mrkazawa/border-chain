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

  addPayloadAddedEventListener(vendor) {
    this.contract.events.PayloadAdded({
      fromBlock: 0
    }, async function (error, event) {
      if (error) log(chalk.red(error));
  
      const payloadHash = event.returnValues['payloadHash'];
      const sender = event.returnValues['sender'];
      const target = event.returnValues['target'];
      const approver = event.returnValues['approver'];
  
      if (approver == vendor.address) {
        log(chalk.yellow(`Contract event: ${payloadHash} payload is stored`));

        Processor.processPayloadAddedEvent(payloadHash, sender, target, approver);
      }
    });
  }

  addDeviceApprovedEventListener(vendor) {
    this.contract.events.DeviceApproved({
      fromBlock: 0
    }, function (error, event) {
      if (error) log(chalk.red(error));

      const payloadHash = event.returnValues['payloadHash'];
      const sender = event.returnValues['sender'];

      if (sender == vendor.address) {
        log(chalk.yellow(`Contract event: ${payloadHash} payload is approved`));

        Processor.processDeviceApprovedEvent(payloadHash);
      }
    });
  }

  async approveDevice(authHash, vendor, txNonce) {
    const approveAuth = this.contract.methods.approveDevice(authHash).encodeABI();
    const approveAuthTx = {
      from: vendor.address,
      to: this.contractAddress,
      nonce: txNonce,
      gasLimit: 5000000,
      gasPrice: 5000000000,
      data: approveAuth
    };
  
    const signedTx = CryptoUtil.signTransaction(vendor.privateKey, approveAuthTx);
    if (!isBenchmarking()) EthereumUtil.sendTransaction(signedTx);
  }
}

module.exports = Contract;