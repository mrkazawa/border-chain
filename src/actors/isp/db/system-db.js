const Database = require('../../utils/db');
const db = new Database();

/**
 * System Database Class.
 * 
 * This class is to store system parameters.
 * For exmaple, the Ethereum identity (private key, public key, and address),
 * current transaction nonce, contract abi.
 */
class SystemDatabase {
  /**
   * Store Ethereum object identity of the ISP.
   * 
   * @param {object} isp an identity object for ISP (includes private key, public key, and blockchain address)
   */
  static async storeIspIdentity(isp) {
    try {
      await db.set('isp', isp);
    } catch (err) {
      throw new Error(`system db: error when storing isp identity! ${err}`);
    }
  }

  /**
   * Store the ABI of the smart contract.
   * 
   * @param {object} contractAbi smart contract ABI object 
   */
  static async storeContractAbi(contractAbi) {
    try {
      await db.set('abi', contractAbi);
    } catch (err) {
      throw new Error(`system db: error when storing contract abi! ${err}`);
    }
  }

  /**
   * Store the current transaction (tx) nonce from Ethereum.
   * 
   * @param {number} txNonce current tx nonce 
   */
  static async storeTxNonce(txNonce) {
    try {
      await db.set('txNonce', txNonce);
    } catch (err) {
      throw new Error(`system db: error when storing tx nonce! ${err}`);
    }
  }

  /**
   * Get the private key, public key, and blockchain address of the ISP.
   */
  static async getIspIdentity() {
    try {
      return await db.get('isp');
    } catch (err) {
      throw new Error(`system db: error when getting isp identity! ${err}`);
    }
  }

  /**
   * Get the smart contract ABI object.
   */
  static async getContractAbi() {
    try {
      return await db.get('abi');
    } catch (err) {
      throw new Error(`system db: error when getting contract abi! ${err}`);
    }
  }

  /**
   * Get the current transaction nonce.
   */
  static async getCurrentTxNonce() {
    try {
      return await db.get('txNonce');
    } catch (err) {
      throw new Error(`system db: error when getting current tx nonce! ${err}`);
    }
  }

  /**
   * Increment the currently stored tx nonce.
   * When we send mulitple transactions, we need to send them
   * in order with the correct sequential number.
   */
  static async incrementTxNonce() {
    try {
      await db.incr('txNonce', 1);
    } catch (err) {
      throw new Error(`system db: error when incrementing tx nonce! ${err}`);
    }
  }
}

module.exports = SystemDatabase;