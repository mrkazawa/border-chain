const chalk = require('chalk');
const log = console.log;

const isBenchmarkingGateway = () => {
  return (process.env.BENCHMARKING_GATEWAY == "true");
};

const isBenchmarkingAccess = () => {
  return (process.env.BENCHMARKING_ACCESS == "true");
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

  addPayloadAddedEventListener(gateway) {
    this.contract.events.PayloadAdded({
      fromBlock: 0
    }, async function (error, event) {
      if (error) log(chalk.red(error));

      const payloadHash = event.returnValues['payloadHash'];
      const sender = event.returnValues['sender'];
      const target = event.returnValues['target'];
      const approver = event.returnValues['approver'];

      if (sender == gateway.address) {
        log(chalk.yellow(`Contract event: ${payloadHash} device authentication payload is stored`));
        Processor.processAuthenticationPayloadAddedEvent(payloadHash, target, gateway, approver);
      
      } else if (approver == gateway.address) {
        log(chalk.yellow(`Contract event: ${payloadHash} access authorization payload is stored`));
        Processor.processAuthorizationPayloadAddedEvent(payloadHash, sender, target, approver);
      }
    });
  }

  addDeviceApprovedEventListener(ourGateway) {
    this.contract.events.DeviceApproved({
      fromBlock: 0
    }, function (error, event) {
      if (error) log(chalk.red(error));

      const payloadHash = event.returnValues['payloadHash'];
      const sender = event.returnValues['sender'];
      const gateway = event.returnValues['source'];
      const device = event.returnValues['target'];

      if (gateway == ourGateway.address) {
        log(chalk.yellow(`Contract event: ${payloadHash} device authentication payload is approved`));
        Processor.processDeviceApprovedEvent(payloadHash, sender, device);
      }
    });
  }

  addAccessApprovedEventListener(gateway) {
    this.contract.events.AccessApproved({
      fromBlock: 0
    }, function (error, event) {
      if (error) log(chalk.red(error));

      const payloadHash = event.returnValues['payloadHash'];
      const approver = event.returnValues['sender'];
      const expiryTime = event.returnValues['expiryTime'];

      if (approver == gateway.address) {
        log(chalk.yellow(`Contract event: ${payloadHash} access authorization payload is approved`));
        Processor.processAccessApprovedEvent(payloadHash, approver, expiryTime);
      }
    });
  }

  storePayload(authHash, deviceAddress, vendorAddress, gateway, txNonce) {
    const storeAuth = this.contract.methods.storePayload(authHash, deviceAddress, vendorAddress).encodeABI();
    const storeAuthTx = {
      from: gateway.address,
      to: this.contractAddress,
      nonce: txNonce,
      gasLimit: 5000000,
      gasPrice: 5000000000,
      data: storeAuth
    };
  
    const signedTx = CryptoUtil.signTransaction(gateway.privateKey, storeAuthTx);
    if (!isBenchmarkingGateway()) EthereumUtil.sendTransaction(signedTx);
  }

  approveAccess(payloadHash, expiryIn, gateway, txNonce) {
    const approveAuth = this.contract.methods.approveAccess(payloadHash, expiryIn).encodeABI();
    const approveAuthTx = {
      from: gateway.address,
      to: this.contractAddress,
      nonce: txNonce,
      gasLimit: 5000000,
      gasPrice: 5000000000,
      data: approveAuth
    };
  
    const signedTx = CryptoUtil.signTransaction(gateway.privateKey, approveAuthTx);
    if (!isBenchmarkingAccess()) EthereumUtil.sendTransaction(signedTx);
  }
}

module.exports = Contract;