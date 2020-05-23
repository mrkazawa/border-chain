const DB = require('./sqlite');

class UserDB extends DB {
  constructor() {
    super();

    this.createUserTable();
    this.clearUserTable(); // for demo, we always start with clean state
  }

  clearUserTable() {
    const sql = 'DELETE FROM Users';
    this.db.prepare(sql).run();
  }

  createUserTable() {
    const sql = ' \
      CREATE TABLE IF NOT EXISTS Users ( \
        Username TEXT PRIMARY KEY, \
        Password TEXT NOT NULL, \
        PublicIp TEXT NOT NULL \
      );';

    this.db.prepare(sql).run();
  }

  insertNewUser(username, password, publicIp) {
    const sql = `INSERT INTO Users \
      (Username, Password, PublicIp) \
      VALUES \
      ('${username}', '${password}', '${publicIp}') \
    `;
    return this.db.prepare(sql).run();
  }

  isUserValid(username, password, publicIp) {
    const sql = `SELECT * FROM Users \
      WHERE Username = '${username}' AND \
      Password = '${password}' AND \
      PublicIp = '${publicIp}'`;
    const rows = this.db.prepare(sql).all();

    return (rows.length == 1);
  }
}

module.exports = UserDB;