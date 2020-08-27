const Database = require('./db');
const db = new Database();

class NonceDatabase {
  static async storeNewNonce(payloadHash) {
    try {
      await db.set(payloadHash, true, 600);
    } catch (err) {
      throw new Error(`error when storing new nonce! ${err}`);
    }
  }

  static async isExist(payloadHash) {
    try {
      const storedPayload = await db.get(payloadHash);
      if (!storedPayload) return false;
      return true;

    } catch (err) {
      throw new Error(`error when getting nonce! ${err}`);
    }
  }
}

module.exports = NonceDatabase;