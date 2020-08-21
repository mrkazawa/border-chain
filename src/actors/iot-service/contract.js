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

  addPayloadAddedEventListener(service, auth, gateway) {
    this.contract.events.PayloadAdded({
      fromBlock: 0
    }, function (error, event) {
      if (error) log(chalk.red(error));

      const payloadHash = event.returnValues['payloadHash'];
      const sender = event.returnValues['sender'];

      if (sender == service.address) {
        log(chalk.yellow(`Contract event: ${payloadHash} payload is stored`));

        Processor.processPayloadAddedEvent(payloadHash, service, auth, gateway);
      }
    });
  }

  async storePayload(payloadHash, gatewayAddress, service) {
    const nonce = await EthereumUtil.getTransactionCount(service.address);
    const storeAuth = this.contract.methods.storePayload(payloadHash, service.address, gatewayAddress).encodeABI();
    const storeAuthTx = {
      from: service.address,
      to: this.contractAddress,
      nonce: nonce,
      gasLimit: 5000000,
      gasPrice: 5000000000,
      data: storeAuth
    };

    const signedStoreAuthTx = CryptoUtil.signTransaction(service.privateKey, storeAuthTx);
    await EthereumUtil.sendTransaction(signedStoreAuthTx);
  }
}

module.exports = Contract;