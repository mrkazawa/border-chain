const Database = require('../../utils/db');
const db = new Database();

/**
 * Payload Database Class.
 * 
 * This class is to store list of gateway authentication payloads.
 */
class PayloadDatabase {
  /**
   * Store new gateway authentication payload.
   * 
   * @param {string} payloadHash payload hash string
   * @param {string} sender blockchain address of authentication sender
   * @param {string} target blockchain address of authentication target
   * @param {string} approver blockchain address of authentication approver
   */
  static async storeNewPayload(payloadHash, sender, target, approver) {
    try {
      const value = {
        sender: sender,
        target: target,
        approver: approver,
        isStored: false,
        isApproved: false,
        isRevoked: false
      }

      await db.set(payloadHash, value);

    } catch (err) {
      throw new Error(`payload db: error when storing new payload! ${err}`);
    }
  }

  /**
   * Update the gateway authentication payload state to stored.
   * This indicates that the payload has been stored in the blockchain network.
   * 
   * @param {string} payloadHash payload hash string
   */
  static async updatePayloadStateToStored(payloadHash) {
    try {
      const value = await db.get(payloadHash);
      if (!value) throw new Error('payload db: payload hash does not exist!');

      value.isStored = true;

      await db.replace(payloadHash, value);

    } catch (err) {
      throw new Error(`payload db: error when updating payload state to stored! ${err}`);
    }
  }

  /**
   * Update the gateway authentication payload state to approved.
   * This indicates that the approver already validated the payload.
   * 
   * @param {string} payloadHash payload hash string
   * @param {string} approver blockchain address of the approver
   */
  static async updatePayloadStateToApproved(payloadHash, approver) {
    try {
      const value = await db.get(payloadHash);

      if (!value) throw new Error('payload db: payload hash does not exist!');
      if (value.approver != approver) throw new Error('payload db: payload hash and approver does not match!');

      value.isApproved = true;

      await db.replace(payloadHash, value);

    } catch (err) {
      throw new Error(`payload db: error when updating payload state to approved! ${err}`);
    }
  }

  /**
   * Get details of the gateway authenticaiton payload of given payload hash.
   * 
   * @param {string} payloadHash payload hash string
   */
  static async getPayload(payloadHash) {
    try {
      const value = await db.get(payloadHash);
      if (!value) throw new Error('payload db: payload hash does not exist!');

      return value;

    } catch (err) {
      throw new Error(`payload db: error when getting payload! ${err}`);
    }
  }

  /**
   * Check whether the gateway authentication payload is already approved.
   * 
   * @param {string} payloadHash payload hash string
   */
  static async isPayloadApproved(payloadHash) {
    try {
      const value = await db.get(payloadHash);
      if (!value || !value.isApproved) return false;
      return true;

    } catch (err) {
      throw new Error(`payload db: error when checking payload approval state! ${err}`);
    }
  }
}

module.exports = PayloadDatabase;