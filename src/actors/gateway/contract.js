const chalk = require('chalk');
const log = console.log;

const isBenchmarkingGateway = () => {
  return (process.env.STRESS_GATEWAY == "true");
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

  addStoredPayloadEventListener(gateway, vendor) {
    this.contract.events.NewPayloadAdded({
      fromBlock: 0
    }, async function (error, event) {
      if (error) log(chalk.red(error));

      const sender = event.returnValues['sender'];
      const payloadHash = event.returnValues['payloadHash'];

      if (sender == gateway.address) {
        log(chalk.yellow(`Receiving ${payloadHash} payload`));

        Processor.processStoredPayload(payloadHash, gateway, vendor);
      }
    });
  }

  storeAuthPayload(authHash, deviceAddress, vendorAddress, gateway, txNonce) {
    const storeAuth = this.contract.methods.storeAuthNPayload(authHash, deviceAddress, vendorAddress).encodeABI();
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
}

module.exports = Contract;