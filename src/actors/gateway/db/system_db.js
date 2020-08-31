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
  static async storeGatewayIdentity(gateway) {
    try {
      await db.set('gateway', gateway);
    } catch (err) {
      throw new Error(`error when initiating gateway identity! ${err}`);
    }
  }

  static async storeContractAbi(contractAbi) {
    try {
      await db.set('abi', contractAbi);
    } catch (err) {
      throw new Error(`error when initiating contract abi! ${err}`);
    }
  }

  static async storeTxNonce(txNonce) {
    try {
      await db.set('txNonce', txNonce);
    } catch (err) {
      throw new Error(`error when initiating current tx nonce! ${err}`);
    }
  }

  static async getGatewayIdentity() {
    try {
      return await db.get('gateway');
    } catch (err) {
      throw new Error(`error when getting gateway identity! ${err}`);
    }
  }

  static async getContractAbi() {
    try {
      return await db.get('abi');
    } catch (err) {
      throw new Error(`error when getting contract abi! ${err}`);
    }
  }

  static async getCurrentTxNonce() {
    try {
      return await db.get('txNonce');
    } catch (err) {
      throw new Error(`error when getting current tx nonce! ${err}`);
    }
  }

  static async incrementTxNonce() {
    try {
      await db.incr('txNonce', 1);
    } catch (err) {
      throw new Error(`error when incrementing tx nonce! ${err}`);
    }
  }
}

module.exports = SystemDatabase;