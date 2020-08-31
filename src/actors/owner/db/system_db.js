const Database = require('../../utils/db');
const db = new Database();

/**
 * System Database Class.
 * 
 * This class is to store system parameters.
 */
class SystemDatabase {
  /**
   * Store Ethereum object identity of the domain owner.
   * 
   * @param {object} owner an identity object for owner (includes private key, public key, and blockchain address)
   */
  static async storeOwnerIdentity(owner) {
    try {
      await db.set('owner', owner);
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
}

module.exports = SystemDatabase;