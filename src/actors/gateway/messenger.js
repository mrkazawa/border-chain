const HttpUtil = require('../utils/http-util');

const {
  ADMIN_GATEWAY_INFO_URL,
  ADMIN_DEVICE_INFO_URL,
  ADMIN_ABI_URL,
  ADMIN_SEED_ETHER_URL,
  VENDOR_AUTHN_URL,
} = require('./config');

class Messenger {
  static async sendAuthenticationPayloadToVendor(authPayload) {
    const data = {
      payload: authPayload
    };
    return await HttpUtil.post(VENDOR_AUTHN_URL, data);
  }

  static async seedEtherToGateway(gatewayAddress) {
    const url = ADMIN_SEED_ETHER_URL + '/?address=' + gatewayAddress;
    return await HttpUtil.get(url);
  }

  static async getContractAbi() {
    return await HttpUtil.get(ADMIN_ABI_URL);
  }

  static async getGatewayInfo() {
    return await HttpUtil.get(ADMIN_GATEWAY_INFO_URL);
  }

  /**
   * Get device info from admin (ONLY FOR BENCHMARKING).
   */
  static async getDeviceInfo() {
    return await HttpUtil.get(ADMIN_DEVICE_INFO_URL);
  }
}

module.exports = Messenger;