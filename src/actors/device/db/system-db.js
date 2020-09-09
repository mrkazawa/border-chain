const Database = require('../../utils/db');
const db = new Database();

/**
 * System Database Class.
 * 
 * This class is to store system parameters.
 */
class SystemDatabase {
  /**
   * Store the device identity.
   * 
   * @param {object} device the device object
   */
  static async storeDeviceIdentity(device) {
    try {
      await db.set('device', device);
    } catch (err) {
      throw new Error(`system db: error when storing device identity! ${err}`);
    }
  }

  /**
   * Store the epoch for benchmark iterations.
   * 
   * @param {number} epoch current epoch
   */
  static async storeEpoch(epoch) {
    try {
      await db.set('epoch', epoch);
    } catch (err) {
      throw new Error(`system db: error when storing epoch! ${err}`);
    }
  }

  /**
   * Get the details of the device.
   */
  static async getDeviceIdentity() {
    try {
      return await db.get('device');
    } catch (err) {
      throw new Error(`system db: error when getting device identity! ${err}`);
    }
  }
  
  /**
   * Get the current epoch.
   */
  static async getCurrentEpoch() {
    try {
      return await db.get('epoch');
    } catch (err) {
      throw new Error(`system db: error when getting current epoch! ${err}`);
    }
  }

  /**
   * Increment the current epoch.
   */
  static async incrementEpoch() {
    try {
      await db.incr('epoch', 1);
    } catch (err) {
      throw new Error(`system db: error when incrementing epoch! ${err}`);
    }
  }
}

module.exports = SystemDatabase;