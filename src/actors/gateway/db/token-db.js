const Database = require('../../utils/db');
const db = new Database();

/**
 * Token Database Class.
 * 
 * This class is to store list of access authorization payloads,
 * similar to authentication payloads.
 * The payload hashes will become access tokens for IoT service.
 */
class TokenDatabase {
  /**
   * Store new authorization payload that will become the access token.
   * 
   * @param {string} payloadHash payload hash string
   * @param {string} sender blockchain address of authorization sender
   * @param {string} target blockchain addresss of authorization target
   * @param {string} approver blockchian address of authorization approver
   */
  static async storeNewToken(payloadHash, sender, target, approver) {
    try {
      const value = {
        sender: sender,
        target: target,
        approver: approver,
        isStored: true,
        isApproved: false,
        isRevoked: false,
        expiryTime: 0,
        accesses: []
      };

      await db.set(payloadHash, value);

    } catch (err) {
      throw new Error(`token db: error when storing new token! ${err}`);
    }
  }

  /**
   * Updating the access token state to apporved.
   * This indicates that the approver already verified
   * the authorization payload.
   * 
   * @param {string} payloadHash payload hash string
   * @param {string} approver blockchain address of authorization approver
   * @param {number} expiryTime expiry time in epoch UNIX time
   */
  static async updateTokenStateToApproved(payloadHash, approver, expiryTime) {
    try {
      const value = await db.get(payloadHash);
      if (!value) throw new Error('token db: payload hash does not exist!');
      if (value.approver != approver) throw new Error('token db: payload hash and approver does not match!');

      value.isApproved = true;
      value.expiryTime = expiryTime;

      await db.replace(payloadHash, value);

    } catch (err) {
      throw new Error(`token db: error when updating token state to approved! ${err}`);
    }
  }

  /**
   * Tie list of accesses to given access token (payload hash string).
   * 
   * @param {string} payloadHash payload hash string
   * @param {object} accesses list of accesses tied to access token
   */
  static async setAccesses(payloadHash, accesses) {
    try {
      const value = await db.get(payloadHash);
      if (!value) throw new Error('token db: payload hash does not exist!');

      value.accesses = accesses;

      await db.replace(payloadHash, value);

    } catch (err) {
      throw new Error(`token db: error when setting accesses to token! ${err}`);
    }
  }

  /**
   * Get the access token detail.
   * 
   * @param {string} payloadHash payload hash string
   */
  static async getTokenObject(payloadHash) {
    try {
      const value = await db.get(payloadHash);
      if (!value) throw new Error('token db: payload hash does not exist!');

      return value;

    } catch (err) {
      throw new Error(`token db: error when getting token! ${err}`);
    }
  }

  /**
   * Check whether the state of the given access token
   * (payload hash string) is approved.
   * 
   * @param {string} payloadHash payload hash string
   */
  static async isTokenApproved(payloadHash) {
    try {
      const value = await db.get(payloadHash);
      if (!value || !value.isApproved) return false;
      return true;

    } catch (err) {
      throw new Error(`token db: error when checking token approval state! ${err}`);
    }
  }
}

module.exports = TokenDatabase;