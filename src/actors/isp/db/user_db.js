const Database = require('./db');
const db = new Database();

class UserDatabase {
  static async storeNewUser(address, username, password, routerIp) {
    try {
      const user = {
        username: username,
        password: password,
        routerIp: routerIp
      };
  
      await db.set(address, user);

    } catch (err) {
      throw new Error(`error when storing new user! ${err}`);
    }
  }

  static async getUser(address) {
    try {
      const storedUser = await db.get(address);
      if (!storedUser) throw new Error('user address does not exist!');

      return storedUser;

    } catch (err) {
      throw new Error(`error when getting user! ${err}`);
    }
  }
}

module.exports = UserDatabase;