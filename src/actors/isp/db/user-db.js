const Database = require('../../utils/db');
const db = new Database();

/**
 * User Database Class.
 * 
 * This class is to store the list of users (as domain owners)
 * registered in the ISP.
 */
class UserDatabase {
  /**
   * Store new users or domain owners in ISP.
   * 
   * @param {string} ownerAddress blockchain address of the domain owner
   * @param {string} username domain owner username
   * @param {string} password domain owner password
   * @param {string} routerIp domain owner registered public IP
   */
  static async storeNewUser(ownerAddress, username, password, routerIp) {
    try {
      const value = {
        username: username,
        password: password,
        routerIp: routerIp
      };
  
      await db.set(ownerAddress, value);

    } catch (err) {
      throw new Error(`user db: error when storing new user! ${err}`);
    }
  }

  /**
   * Get details of domain owner information.
   * 
   * @param {string} ownerAddress blockchain address of the domain owner 
   */
  static async getUser(ownerAddress) {
    try {
      const value = await db.get(ownerAddress);
      if (!value) throw new Error('user db: user address does not exist!');

      return value;

    } catch (err) {
      throw new Error(`user db: error when getting user! ${err}`);
    }
  }
}

module.exports = UserDatabase;