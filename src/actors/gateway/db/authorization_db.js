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
        isRevoked: false
      }

      await db.set(payloadHash, payload);

    } catch (err) {
      throw new Error(`error when storing new payload! ${err}`);
    }
  }

  static async updatePayloadStateToApproved(payloadHash, approver, device) {
    try {
      const storedPayload = await db.get(payloadHash);

      if (!storedPayload) throw new Error('payload hash does not exist!');
      if (storedPayload.deviceAddress != device) throw new Error('payload hash and device does not match!');

      storedPayload.approverAddress = approver;
      storedPayload.isApproved = true;

      await db.replace(payloadHash, storedPayload);

    } catch (err) {
      throw new Error(`error when updating payload state to approved! ${err}`);
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

  static async doesPayloadExist(payloadHash) {
    const storedPayload = await db.get(payloadHash);
    if (!storedPayload) return false;
    return true;
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