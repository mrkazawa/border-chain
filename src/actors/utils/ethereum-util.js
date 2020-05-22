const web3 = require('./web3');

// an ethereum address with many Ether to be leeched.
const POOL_SOURCE = '0xaE7DE0a0E7dD1a63C916fFd229F2501292B79643';

class EthereumUtil {
  static constructSmartContract(abi, address) {
    return new web3.eth.Contract(abi, address);
  }

  static seedEther(address, amount) {
    web3.eth.sendTransaction({
      from: POOL_SOURCE,
      to: address,
      value: web3.utils.toWei(amount, 'ether')
    });
  }

  static async getBalance(address) {
    return await web3.eth.getBalance(address);
  }

  static convertStringToByte(string) {
    return web3.utils.fromAscii(string);
  }

  static convertByteToString(byte) {
    return web3.utils.toAscii(byte);
  }
}

module.exports = EthereumUtil;