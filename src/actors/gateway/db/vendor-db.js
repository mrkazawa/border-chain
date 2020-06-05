const DB = require('./sqlite');

class VendorDB extends DB {
  constructor() {
    super();

    this.createVendorTable();
    this.clearVendorTable(); // for demo, we always start with clean state
  }

  clearVendorTable() {
    const sql = 'DELETE FROM Vendors';
    this.db.prepare(sql).run();
  }

  createVendorTable() {
    const sql = ' \
      CREATE TABLE IF NOT EXISTS Vendors ( \
        VendorID TEXT PRIMARY KEY, \
        Address TEXT NOT NULL, \
        PublicKey TEXT NOT NULL \
      );';

    this.db.prepare(sql).run();
  }

  insertNewVendor(vendorId, address, publicKey) {
    const sql = `INSERT INTO Vendors \
      (VendorID, Address, PublicKey) \
      VALUES \
      ('${vendorId}', '${address}', '${publicKey}') \
    `;
    return this.db.prepare(sql).run();
  }

  isVendorExist(vendorId) {
    const sql = `SELECT * FROM Vendors \
      WHERE VendorID = '${vendorId}'`;
    const rows = this.db.prepare(sql).all();

    return (rows.length == 1);
  }

  getVendorDetail(vendorId) {
    const sql = `SELECT * FROM Vendors \
      WHERE VendorID = '${vendorId}'`;
    return this.db.prepare(sql).all();
  }
}

module.exports = VendorDB;