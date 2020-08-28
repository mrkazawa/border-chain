const Database = require('./db');
const db = new Database();

class NonceDatabase {
  static async storeNewNonce(nonce) {
    try {
      await db.set(nonce, 'secret'); // secret string is the default
    } catch (err) {
      throw new Error(`nonce db: error when storing new nonce! ${err}`);
    }
  }

  static async updateSecret(nonce, secret) {
    try {
      const storedNonce = await db.get(nonce);
      if (!storedNonce) throw new Error('nonce db: nonce not found!');

      await db.replace(nonce, secret);

    } catch (err) {
      throw new Error(`nonce db: error when updating secret! ${err}`);
    }
  }

  static async isExist(nonce) {
    try {
      const storedNonce = await db.get(nonce);
      if (!storedNonce) return false;
      return true;

    } catch (err) {
      throw new Error(`nonce db: error when getting nonce! ${err}`);
    }
  }

  // TODO: Add delete nonce when the session or access token expires
}

module.exports = NonceDatabase;