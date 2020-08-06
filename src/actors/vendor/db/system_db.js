const Database = require('./db');
const db = new Database();

class SystemDatabase {
  static async initiateVendorIdentity(vendor) {
    try {
      await db.set('vendor', vendor);
    } catch (err) {
      throw new Error(`error when initiating vendor identity! ${err}`);
    }
  }

  static async initiateDeviceIdentity(device) {
    try {
      await db.set('device', device);
    } catch (err) {
      throw new Error(`error when initiating device identity! ${err}`);
    }
  }

  static async initiateContractAbi(contractAbi) {
    try {
      await db.set('abi', contractAbi);
    } catch (err) {
      throw new Error(`error when initiating contract abi! ${err}`);
    }
  }

  static async initiateTxNonce(currentTxNonce) {
    try {
      await db.set('txNonce', currentTxNonce);
    } catch (err) {
      throw new Error(`error when initiating current tx nonce! ${err}`);
    }
  }

  static async getVendorIdentity() {
    try {
      return await db.get('vendor');
    } catch (err) {
      throw new Error(`error when getting vendor identity! ${err}`);
    }
  }

  static async getDeviceIdentity() {
    try {
      return await db.get('device');
    } catch (err) {
      throw new Error(`error when getting device identity! ${err}`);
    }
  }

  static async getContractAbi() {
    try {
      return await db.get('abi');
    } catch (err) {
      throw new Error(`error when getting contract abi! ${err}`);
    }
  }

  static async getCurrentTxNonce() {
    try {
      return await db.get('txNonce');
    } catch (err) {
      throw new Error(`error when getting current tx nonce! ${err}`);
    }
  }

  static async incrementTxNonce() {
    try {
      await db.incr('txNonce', 1);
    } catch (err) {
      throw new Error(`error when incrementing tx nonce! ${err}`);
    }
  }
}

module.exports = SystemDatabase;