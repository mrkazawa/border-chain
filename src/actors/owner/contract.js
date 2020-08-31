const chalk = require('chalk');
const log = console.log;

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

  addPayloadAddedEventListener(owner, auth, isp) {
    this.contract.events.PayloadAdded({
      fromBlock: 0
    }, function (error, event) {
      if (error) log(chalk.red(error));

      const payloadHash = event.returnValues['payloadHash'];
      const sender = event.returnValues['sender'];

      if (sender == owner.address) {
        log(chalk.yellow(`Contract event: ${payloadHash} payload is stored`));

        Processor.processPayloadAddedEvent(payloadHash, owner, auth, isp);
      }
    });
  }

  addGatewayApprovedEventListener(ourGateway) {
    this.contract.events.GatewayApproved({
      fromBlock: 0
    }, function (error, event) {
      if (error) log(chalk.red(error));

      const payloadHash = event.returnValues['payloadHash'];
      const approver = event.returnValues['sender'];
      const gateway = event.returnValues['target'];

      if (gateway == ourGateway.address) {
        log(chalk.yellow(`Contract event: ${payloadHash} payload is approved`));

        Processor.processGatewayApprovedEvent(payloadHash, approver, ourGateway);
      }
    });
  }

  async storePayload(payloadHash, gatewayAddress, ispAddress, owner) {
    const nonce = await EthereumUtil.getTransactionCount(owner.address);
    const storeAuth = this.contract.methods.storePayload(payloadHash, gatewayAddress, ispAddress).encodeABI();
    const storeAuthTx = {
      from: owner.address,
      to: this.contractAddress,
      nonce: nonce,
      gasLimit: 5000000,
      gasPrice: 5000000000,
      data: storeAuth
    };

    const signedStoreAuthTx = CryptoUtil.signTransaction(owner.privateKey, storeAuthTx);
    await EthereumUtil.sendTransaction(signedStoreAuthTx);
  }
}

module.exports = Contract;