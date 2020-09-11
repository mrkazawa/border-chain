const Database = require('../../utils/db');
const db = new Database();

/**
 * Payload Database Class.
 * 
 * This class is to store list of gateway authentication payloads.
 */
class PayloadDatabase {
  /**
   * Store new gateway authentication payload from owner.
   * 
   * @param {string} payloadHash payload hash string
   * @param {string} source blockchain address of the authentication sender
   * @param {string} target blockchain address of the authentication target
   * @param {string} approver blockchain address of the authentication approver
   */
  static async storeNewPayload(payloadHash, source, target, approver) {
    try {
      const value = {
        source: source,
        target: target,
        approver: approver,
        isStored: true,
        isApproved: false,
        isRevoked: false
      }

      await db.set(payloadHash, value);

    } catch (err) {
      throw new Error(`payload db: error when storing new payload! ${err}`);
    }
  }

  /**
   * Update the state of the payload to stored.
   * This indicates that the apporver already verified the payload.
   * 
   * @param {string} payloadHash payload hash string
   */
  static async updatePayloadStateToApproved(payloadHash) {
    try {
      const value = await db.get(payloadHash);
      if (!value) throw new Error('payload db: payload hash does not exist!');

      value.isApproved = true;

      await db.replace(payloadHash, value);

    } catch (err) {
      throw new Error(`payload db: error when updating payload state to approved! ${err}`);
    }
  }

  /**
   * Get details of gateway authentication payload.
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