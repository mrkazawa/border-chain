const Database = require('./db');
const db = new Database();

class AuthorizationDatabase {
  static async storeNewPayload(payloadHash, sender, target, approver) {
    try {
      const payload = {
        sender: sender,
        target: target,
        approver: approver,
        isStored: true,
        isApproved: false,
        isRevoked: false,
        expiryTime: 0,
        accesses: []
      }

      await db.set(payloadHash, payload);

    } catch (err) {
      throw new Error(`error when storing new payload! ${err}`);
    }
  }

  static async updatePayloadStateToApproved(payloadHash, approver, expiryTime) {
    try {
      const storedPayload = await db.get(payloadHash);
      if (!storedPayload) throw new Error('payload hash does not exist!');
      if (storedPayload.approver != approver) throw new Error('payload hash and approver does not match!');

      storedPayload.isApproved = true;
      storedPayload.expiryTime = expiryTime;

      await db.replace(payloadHash, storedPayload);

    } catch (err) {
      throw new Error(`error when updating payload state to approved! ${err}`);
    }
  }

  static async setAccesses(payloadHash, accesses) {
    try {
      const storedPayload = await db.get(payloadHash);
      if (!storedPayload) throw new Error('payload hash does not exist!');

      storedPayload.accesses = accesses;

      await db.replace(payloadHash, storedPayload);

    } catch (err) {
      throw new Error(`error when setting accesses to payload! ${err}`);
    }
  }

  static async getPayload(payloadHash) {
    try {
      const storedPayload = await db.get(payloadHash);
      if (!storedPayload) throw new Error('payload hash does not exist!');

      return storedPayload;

    } catch (err) {
      throw new Error(`error when getting payload! ${err}`);
    }
  }

  static async isPayloadApproved(payloadHash) {
    try {
      const storedPayload = await db.get(payloadHash);
      if (!storedPayload || !storedPayload.isApproved) return false;
      return true;

    } catch (err) {
      throw new Error(`error when checking payload approval state! ${err}`);
    }
  }
}

module.exports = AuthorizationDatabase;