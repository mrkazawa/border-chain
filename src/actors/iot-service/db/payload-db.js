const Database = require('../../utils/db');
const db = new Database();

/**
 * Payload Database Class.
 * 
 * This class is to store list of access authorization payloads.
 * The payload hashes will become access tokens for IoT service.
 */
class PayloadDatabase {
  /**
   * Store new access authorization payload.
   * 
   * @param {string} payloadHash payload hash string
   * @param {string} sender blockchain address of authorization sender
   * @param {string} target blockchain address of authorization target
   * @param {string} approver blockchain address of authorization approver
   */
  static async storeNewPayload(payloadHash, sender, target, approver) {
    try {
      const value = {
        sender: sender,
        target: target,
        approver: approver,
        isStored: false,
        isApproved: false,
        isRevoked: false,
        expiryTime: 0,
        accesses: []
      }

      await db.set(payloadHash, value);

    } catch (err) {
      throw new Error(`payload db: error when storing new payload! ${err}`);
    }
  }

  /**
   * Updating the state of payload to stored.
   * This indicates that the payload has been stored in the blockchain.
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
   * Updating the payload state to approved.
   * This indicates that the approver has validated
   * the gateway authorization payload.
   * 
   * @param {string} payloadHash payload hash string
   * @param {string} approver blockchain address of authorization approver
   * @param {number} expiryTime expiry time in epoch UNIX time
   */
  static async updatePayloadStateToApproved(payloadHash, approver, expiryTime) {
    try {
      const value = await db.get(payloadHash);

      if (!value) throw new Error('payload db: payload hash does not exist!');
      if (value.approver != approver) throw new Error('payload db: payload hash and approver does not match!');

      value.isApproved = true;
      value.expiryTime = expiryTime;

      await db.replace(payloadHash, value);

    } catch (err) {
      throw new Error(`payload db: error when updating payload state to approved! ${err}`);
    }
  }

  /**
   * Get details of the authorization payload.
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
   * Check whether the given authentication payload is already stored.
   * 
   * @param {string} payloadHash payload hash string
   */
  static async isPayloadStored(payloadHash) {
    try {
      const value = await db.get(payloadHash);
      if (!value || !value.isStored) return false;
      return true;

    } catch (err) {
      throw new Error(`payload db: error when checking payload store state! ${err}`);
    }
  }

  /**
   * Check whether the authorization payload is already approved.
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