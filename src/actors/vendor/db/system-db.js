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
   * Store Ethereum object identity of the vendor.
   * 
   * @param {object} vendor an identity object for vendor (includes private key, public key, and blockchain address)
   */
  static async storeVendorIdentity(vendor) {
    try {
      await db.set('vendor', vendor);
    } catch (err) {
      throw new Error(`system db: error when storing vendor identity! ${err}`);
    }
  }

  /**
   * Store the device properties.
   * 
   * @param {object} device device properties object
   */
  static async storeDeviceIdentity(device) {
    try {
      await db.set('device', device);
    } catch (err) {
      throw new Error(`system db: error when storing device identity! ${err}`);
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
   * Get the private key, public key, and blockchain address of the vendor.
   */
  static async getVendorIdentity() {
    try {
      return await db.get('vendor');
    } catch (err) {
      throw new Error(`system db: error when getting vendor identity! ${err}`);
    }
  }

  /**
   * Get the device properties of the device.
   */
  static async getDeviceIdentity() {
    try {
      return await db.get('device');
    } catch (err) {
      throw new Error(`system db: error when getting device identity! ${err}`);
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