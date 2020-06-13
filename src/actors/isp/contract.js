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

  addStoredPayloadEventListener(isp) {
    this.contract.events.NewPayloadAdded({
      fromBlock: 0
    }, async function (error, event) {
      if (error) log(chalk.red(error));
  
      const sender = event.returnValues['sender'];
      const payloadHash = event.returnValues['payloadHash'];
      const verifier = event.returnValues['verifier'];
  
      if (verifier == isp.address) {
        log(chalk.yellow(`Receiving ${payloadHash} payload`));
        
        Processor.processStoredPayload(payloadHash, sender);
      }
    });
  }

  addGatewayVerifiedEventListener(isp) {
    this.contract.events.GatewayVerified({
      fromBlock: 0
    }, function (error, event) {
      if (error) log(chalk.red(error));

      const sender = event.returnValues['sender'];
      const payloadHash = event.returnValues['payloadHash'];
      const gateway = event.returnValues['gateway'];

      if (sender == isp.address) {
        log(chalk.yellow(`Verified payload ${payloadHash}`));

        Processor.processVerifiedPayload(payloadHash, gateway);
      }
    });
  }

  async verifyAuthPayload(payloadHash, routerIP, isp, txNonce) {
    const routerIPInBytes = EthereumUtil.convertStringToByte(routerIP);
    const verifyAuth = this.contract.methods.verifyAuthNGateway(payloadHash, routerIPInBytes).encodeABI();
    const verifyAuthTx = {
      from: isp.address,
      to: this.contractAddress,
      nonce: txNonce,
      gasLimit: 5000000,
      gasPrice: 5000000000,
      data: verifyAuth
    };
  
    const signedTx = CryptoUtil.signTransaction(isp.privateKey, verifyAuthTx);
    if (!isBenchmarking()) EthereumUtil.sendTransaction(signedTx);
  }
}

module.exports = Contract;