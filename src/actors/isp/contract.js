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

  addPayloadAddedEventListener(isp) {
    this.contract.events.PayloadAdded({
      fromBlock: 0
    }, async function (error, event) {
      if (error) log(chalk.red(error));
  
      const payloadHash = event.returnValues['payloadHash'];
      const sender = event.returnValues['sender'];
      const approver = event.returnValues['approver'];
  
      if (approver == isp.address) {
        log(chalk.yellow(`Contract event: ${payloadHash} payload is stored`));
        
        Processor.processPayloadAddedEvent(payloadHash, sender);
      }
    });
  }

  addGatewayApprovedEventListener(isp) {
    this.contract.events.GatewayApproved({
      fromBlock: 0
    }, function (error, event) {
      if (error) log(chalk.red(error));

      const payloadHash = event.returnValues['payloadHash'];
      const sender = event.returnValues['sender'];
      const gateway = event.returnValues['gateway'];

      if (sender == isp.address) {
        log(chalk.yellow(`Contract event: ${payloadHash} payload is approved`));

        Processor.processGatewayApprovedEvent(payloadHash, gateway);
      }
    });
  }

  async approveGateway(payloadHash, routerIp, isp, txNonce) {
    const routerIpInBytes = EthereumUtil.convertStringToByte(routerIp);
    const approveAuth = this.contract.methods.approveGateway(payloadHash, routerIpInBytes).encodeABI();
    const approveAuthTx = {
      from: isp.address,
      to: this.contractAddress,
      nonce: txNonce,
      gasLimit: 5000000,
      gasPrice: 5000000000,
      data: approveAuth
    };
  
    const signedTx = CryptoUtil.signTransaction(isp.privateKey, approveAuthTx);
    if (!isBenchmarking()) EthereumUtil.sendTransaction(signedTx);
  }
}

module.exports = Contract;