const DB = require('./sqlite');

const STATUS_ID = {
  CREATED: 0,
  VERIFIED: 1
};

class AuthPayloadDB extends DB {
  constructor() {
    super();

    this.createPayloadTable();
    this.clearPayloadTable(); // for demo, we always start with clean state
  }

  clearPayloadTable() {
    const sql = 'DELETE FROM AuthPayloads';
    this.db.prepare(sql).run();
  }

  createPayloadTable() {
    const sql = ' \
      CREATE TABLE IF NOT EXISTS AuthPayloads ( \
        PayloadID TEXT PRIMARY KEY, \
        Target TEXT NOT NULL, \
        Verifier TEXT NOT NULL, \
        AuthOption INTEGER NOT NULL, \
        Payload TEXT NOT NULL, \
        Status INTEGER NOT NULL, \
      );';

    this.db.prepare(sql).run();
  }

  insertNewPayload(payloadHash, target, verifier, authOption, payload) {
    const sql = `INSERT INTO AuthPayloads \
      (PayloadID, Target, Verifier, AuthOption, Payload, Status) \
      VALUES \
      ('${payloadHash}', '${target}', '${verifier}', ${authOption}, '${payload}', ${STATUS_ID.CREATED}) \
    `;
    return this.db.prepare(sql).run();
  }

  isPayloadExist(payloadHash) {
    const sql = `SELECT * FROM AuthPayloads \
      WHERE PayloadID = '${payloadHash}'`;
    const rows = this.db.prepare(sql).all();

    return (rows.length == 1);
  }

  isPayloadVerified(payloadHash) {
    const sql = `SELECT * FROM AuthPayloads \
      WHERE PayloadID = '${payloadHash}' AND Status = ${STATUS_ID.VERIFIED}`;
    const rows = this.db.prepare(sql).all();

    return (rows.length == 1);
  }

  changePayloadStatusToVerified(payloadHash) {
    const sql = `UPDATE AuthPayloads \
      SET Status = ${STATUS_ID.VERIFIED} \
      WHERE PayloadID = '${payloadHash}' \
    `;
    return this.db.prepare(sql).run();
  }
}

module.exports = AuthPayloadDB;