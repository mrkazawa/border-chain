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
   * Get the private key, public key, and blockchain address of the IoT service.
   */
  static async getServiceIdentity() {
    try {
      return await db.get('service');
    } catch (err) {
      throw new Error(`system db: error when getting IoT service identity! ${err}`);
    }
  }
}

module.exports = SystemDatabase;