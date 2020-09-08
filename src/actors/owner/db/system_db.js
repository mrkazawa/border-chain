const Database = require('../../utils/db');
const db = new Database();

/**
 * System Database Class.
 * 
 * This class is to store system parameters.
 */
class SystemDatabase {
  /**
   * Store the domain owner identity.
   * 
   * @param {object} owner the Ethereum identity object for owner
   * @param {object} creds the domain owner credentials for ISP
   */
  static async storeOwnerIdentity(owner, creds) {
    try {
      const value = {
        privateKey: owner.privateKey,
        publicKey: owner.publicKey,
        address: owner.address,
        username: creds.username,
        password: creds.password
      }
      await db.set('owner', value);
    } catch (err) {
      throw new Error(`system db: error when storing owner identity! ${err}`);
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
   * Store Ethereum object identity of the ISP.
   * 
   * @param {object} isp the identity object for isp
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
   * Get the private key, public key, and blockchain address of the domain owner.
   */
  static async getOwnerIdentity() {
    try {
      return await db.get('owner');
    } catch (err) {
      throw new Error(`system db: error when getting domain owner identity! ${err}`);
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
   * Get details of the ISP identity.
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