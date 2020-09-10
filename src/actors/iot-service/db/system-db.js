const Database = require('../../utils/db');
const db = new Database();

/**
 * System Database Class.
 * 
 * This class is to store system parameters.
 */
class SystemDatabase {
  /**
   * Store Ethereum object identity of the IoT service.
   * 
   * @param {object} service an identity object for IoT service (includes private key, public key, and blockchain address)
   */
  static async storeServiceIdentity(service) {
    try {
      await db.set('service', service);
    } catch (err) {
      throw new Error(`system db: error when storing IoT service identity! ${err}`);
    }
  }

  /**
   * Store Ethereum object identity of the gateway.
   * 
   * @param {object} gateway an identity object for gateway (includes private key, public key, and blockchain address)
   */
  static async storeGatewayIdentity(gateway) {
    try {
      await db.set('gateway', gateway);
    } catch (err) {
      throw new Error(`system db: error when storing gateway identity! ${err}`);
    }
  }

  /**
   * Store the ABI of the smart contract.
   * 
   * @param {object} contractAbi smart contract ABI object
   */
  static async storeContractAbi(abi) {
    try {
      await db.set('abi', abi);
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
   * Store the list of authorized IoT access from the gateway.
   * 
   * @param {number} accesses array of IoT access from the gateway
   */
  static async storeAccesses(accesses) {
    try {
      await db.set('accesses', accesses);
    } catch (err) {
      throw new Error(`system db: error when storing accesses! ${err}`);
    }
  }

  /**
   * Get the private key, public key, and blockchain address of the IoT service.
   */
  static async getServiceIdentity() {
    try {
      return await db.get('service');
    } catch (err) {
      throw new Error(`system db: error when getting IoT service identity! ${err}`);
    }
  }

  /**
   * Get the private key, public key, and blockchain address of the gateway.
   */
  static async getGatewayIdentity() {
    try {
      return await db.get('gateway');
    } catch (err) {
      throw new Error(`system db: error when getting gateway identity! ${err}`);
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
   * Get the detail list of IoT accesses.
   */
  static async getAccesses() {
    try {
      return await db.get('accesses');
    } catch (err) {
      throw new Error(`system db: error when getting accesses! ${err}`);
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