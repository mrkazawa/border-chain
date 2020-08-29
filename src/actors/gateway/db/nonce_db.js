const Database = require('./db');
const db = new Database();

class NonceDatabase {
  static async storeNewNonce(nonce) {
    try {
      await db.set(nonce, 'secret'); // default value
    } catch (err) {
      throw new Error(`nonce db: error when storing new nonce! ${err}`);
    }
  }

  static async updateSecret(nonce, secret) {
    try {
      const value = await db.get(nonce);
      if (!value) throw new Error('nonce db: nonce not found!');

      await db.replace(nonce, secret);

    } catch (err) {
      throw new Error(`nonce db: error when updating secret! ${err}`);
    }
  }

  static async getSecret(nonce) {
    try {
      const value = await db.get(nonce);
      if (!value) throw new Error('nonce db: nonce not found!');

      return value;

    } catch (err) {
      throw new Error(`nonce db: error when updating secret! ${err}`);
    }
  }

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