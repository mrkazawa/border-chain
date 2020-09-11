const Database = require('../../utils/db');
const db = new Database();

/**
 * Payload Database Class.
 * 
 * This class is to store the list of IoT device authentication payload
 * that the gateway sends to vendor.
 */
class PayloadDatabase {
  /**
   * Store new device authentication payload.
   * 
   * @param {object} auth the device authentication payload
   * @param {string} payloadHash payload hash string
   * @param {number} authOption the type of device authentication option
   * @param {string} deviceSignature the device signature from vendor
   * @param {string} vendorAddress the corresponding vendor blockchain address
   * @param {string} vendorPublicKey the corresponding vendor public key
   * @param {string} target the device blockchain address
   */
  static async storeNewPayload(auth, payloadHash, authOption, deviceSignature, vendorAddress, vendorPublicKey, target) {
    try {
      const value = {
        auth: auth,
        authHash: payloadHash,
        authOption: authOption,
        deviceSignature: deviceSignature,
        vendorAddress: vendorAddress,
        vendorPublicKey: vendorPublicKey,
        source: '',
        target: target,
        approver: '',
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
   * Update the state of the authentication payload to stored.
   * 
   * @param {string} payloadHash payload hash string
   * @param {string} source the gateway blockchain address
   * @param {string} target the device blockchain address
   * @param {string} approver the vendor blockchain address
   */
  static async updatePayloadStateToStored(payloadHash, source, target, approver) {
    try {
      const value = await db.get(payloadHash);

      if (!value) throw new Error('payload db: payload hash does not exist!');
      if (value.target != target) throw new Error('payload db: payload hash and device does not match!');

      value.source = source;
      value.approver = approver;
      value.isStored = true;

      await db.replace(payloadHash, value);

    } catch (err) {
      throw new Error(`payload db: error when updating payload state to stored! ${err}`);
    }
  }

  /**
   * Update the state of the authentication payload to approved.
   * 
   * @param {string} payloadHash payload hash string
   * @param {string} approver the vendor blockchain address
   * @param {string} target the device blockchain address
   */
  static async updatePayloadStateToApproved(payloadHash, approver, target) {
    try {
      const value = await db.get(payloadHash);

      if (!value) throw new Error('payload db: payload hash does not exist!');
      if (value.target != target) throw new Error('payload db: payload hash and device does not match!');
      if (value.approver != approver) throw new Error('payload db: payload hash and approver does not match!');

      value.isApproved = true;

      await db.replace(payloadHash, value);

    } catch (err) {
      throw new Error(`payload db: error when updating payload state to approved! ${err}`);
    }
  }

  /**
   * Get the details of device authentication payload.
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
   * Check whether the given authentication payload exist.
   * 
   * @param {string} payloadHash payload hash string
   */
  static async doesPayloadExist(payloadHash) {
    const value = await db.get(payloadHash);
    if (!value) return false;
    return true;
  }

  /**
   * Check whether the given authentication payload is already approved.
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