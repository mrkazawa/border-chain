const Database = require('../../utils/db');
const db = new Database();

/**
 * Access Database Class.
 * 
 * This class is to store the list of accessess
 * given to IoT services.
 */
class AccessDatabase {
  /**
   * Store new accessess for the given IoT service.
   * 
   * @param {string} serviceAddress the IoT service blockchain address
   * @param {object} accesses the access object for this service
   */
  static async storeNewAccess(serviceAddress, accesses) {
    try {
      await db.set(serviceAddress, accesses);

    } catch (err) {
      throw new Error(`access db: error when storing new accesses ${err}`);
    }
  }

  /**
   * Get details of the accesses.
   * 
   * @param {string} serviceAddress the IoT service blockchain address
   */
  static async getAccess(serviceAddress) {
    try {
      const value = await db.get(serviceAddress);
      if (!value) throw new Error('access db: not found');

      return value;

    } catch (err) {
      throw new Error(`access db: error when getting access ${err}`);
    }
  }
}

module.exports = AccessDatabase;