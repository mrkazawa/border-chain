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

  addStoredPayloadEventListener(owner, auth, isp) {
    this.contract.events.NewPayloadAdded({
      fromBlock: 0
    }, function (error, event) {
      if (error) log(chalk.red(error));

      const sender = event.returnValues['sender'];
      const payloadHash = event.returnValues['payloadHash'];
      const target = event.returnValues['target'];

      if (sender == owner.address) {
        log(chalk.yellow(`Owner ${sender} has stored payload ${payloadHash}`));

        Processor.processStoredPayload(owner, auth, isp, target);
      }
    });
  }

  addGatewayVerifiedEventListener(ourGateway) {
    this.contract.events.GatewayVerified({
      fromBlock: 0
    }, function (error, event) {
      if (error) log(chalk.red(error));

      const sender = event.returnValues['sender'];
      const payloadHash = event.returnValues['payloadHash'];
      const gateway = event.returnValues['gateway'];

      if (gateway == ourGateway.address) {
        log(chalk.yellow(`ISP ${sender} has verified payload ${payloadHash} for our gateway ${gateway}`));

        Processor.processVerifiedPayload(ourGateway);
      }
    });
  }

  async storeGatewayAuthPayload(payloadHash, gatewayAddress, ispAddress, owner) {
    const nonce = await EthereumUtil.getTransactionCount(owner.address);
    const storeAuth = this.contract.methods.storeAuthNPayload(payloadHash, gatewayAddress, ispAddress).encodeABI();
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