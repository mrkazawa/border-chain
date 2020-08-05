const Database = require('./db');
const db = new Database();

class SystemDatabase {
  static async getCurrentTxNonce() {
    try {
      return await db.get('txNonce');
    } catch (err) {
      throw new Error(`error when gettomg current tx nonce! ${err}`);
    }
  }

  static async incrementTxNonce() {
    try {
      await db.incr('txNonce', 1);
    } catch (err) {
      throw new Error(`error when incrementing tx nonce! ${err}`);
    }
  }
}

module.exports = SystemDatabase;