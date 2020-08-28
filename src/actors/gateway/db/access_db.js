const Database = require('./db');
const db = new Database();

class AccessDatabase {
  static async storeNewAccess(address, accesses) {
    try {
      await db.set(address, accesses);

    } catch (err) {
      throw new Error(`access db: error when storing new accesses ${err}`);
    }
  }

  static async getAccess(address) {
    try {
      const value = await db.get(address);
      if (!value) throw new Error('access db: not found');

      return value;

    } catch (err) {
      throw new Error(`access db: error when getting access ${err}`);
    }
  }
}

module.exports = AccessDatabase;