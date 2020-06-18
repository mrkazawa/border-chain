const HttpUtil = require('../utils/http-util');

const {
  ADMIN_GATEWAY_LIST_URL,
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

  static async assignEtherToGateway(gatewayAddress) {
    const data = {
      address: gatewayAddress
    };
    return await HttpUtil.post(ADMIN_SEED_ETHER_URL, data);
  }

  static async getContractAbi() {
    return await HttpUtil.get(ADMIN_ABI_URL);
  }

  static async getGatewayInfo() {
    return await HttpUtil.get(ADMIN_GATEWAY_LIST_URL);
  }
}

module.exports = Messenger;