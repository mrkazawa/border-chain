const Database = require('./db');
const db = new Database();

class AccessDatabase {
  static async storeNewAccess(address, accesses) {
    try {
      await db.set(address, accesses);

    } catch (err) {
      throw new Error(`error when storing new accesses for this address! ${err}`);
    }
  }

  static async getAccess(address) {
    try {
      const storedAccess = await db.get(address);
      if (!storedAccess) throw new Error('this address does not exist!');

      return storedAccess;

    } catch (err) {
      throw new Error(`error when getting access! ${err}`);
    }
  }
}

module.exports = AccessDatabase;