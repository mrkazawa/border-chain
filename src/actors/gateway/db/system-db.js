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
   * Store the IoT device authentication payload (ONLY FOR BENCHMARKING).
   * 
   * @param {object} devicePayload the authentication payload from IoT device
   */
  static async storeDevicePayload(devicePayload) {
    try {
      await db.set('devicePayload', devicePayload);
    } catch (err) {
      throw new Error(`system db: error when storing device payload! ${err}`);
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
   * Get the details of IoT device authentication payload (ONLY FOR BENCHMARKING).
   */
  static async getDevicePayload() {
    try {
      return await db.get('devicePayload');
    } catch (err) {
      throw new Error(`system db: error when getting device payload! ${err}`);
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