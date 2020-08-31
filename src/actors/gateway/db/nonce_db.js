const Database = require('../../utils/db');
const db = new Database();

/**
 * Nonce Database Class.
 * 
 * This class is to store list of secret keys generated
 * during the handshake between the gateway and IoT service
 * to protect the access token and resource.
 * 
 * Each exchange will produce unique nonce that we can use as keys.
 * The value will be the assembled secret key.
 */
class NonceDatabase {
  /**
   * Store a new nonce with a default 'secret' value.
   * 
   * @param {string} nonce the nonce string from IoT service during the exchange
   */
  static async storeNewNonce(nonce) {
    try {
      await db.set(nonce, 'secret'); // default value
    } catch (err) {
      throw new Error(`nonce db: error when storing new nonce! ${err}`);
    }
  }

  /**
   * Update the value of secret key from given nonce.
   * 
   * @param {string} nonce the nonce string
   * @param {string} secret the assmebled secet key from the exchange
   */
  static async updateSecret(nonce, secret) {
    try {
      const value = await db.get(nonce);
      if (!value) throw new Error('nonce db: nonce not found!');

      await db.replace(nonce, secret);

    } catch (err) {
      throw new Error(`nonce db: error when updating secret! ${err}`);
    }
  }

  /**
   * Get the current secret key from given nonce.
   * 
   * @param {string} nonce the nonce string
   */
  static async getSecret(nonce) {
    try {
      const value = await db.get(nonce);
      if (!value) throw new Error('nonce db: nonce not found!');

      return value;

    } catch (err) {
      throw new Error(`nonce db: error when updating secret! ${err}`);
    }
  }

  /**
   * Check whether the given nonce exist.
   * 
   * @param {string} nonce the nonce string
   */
  static async isExist(nonce) {
    try {
      const value = await db.get(nonce);
      if (!value) return false;
      return true;

    } catch (err) {
      throw new Error(`nonce db: error when getting nonce! ${err}`);
    }
  }

  // TODO: Add delete nonce when the session or access token expires
}

module.exports = NonceDatabase;