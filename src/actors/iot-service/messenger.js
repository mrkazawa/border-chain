const HttpUtil = require('../utils/http-util');

const {
  ADMIN_ABI_URL,
  ADMIN_SEED_ETHER_URL,
  ADMIN_GATEWAY_INFO_URL,
  GATEWAY_ACCESS_LIST_URL,
  GATEWAY_AUTHZ_URL,
  GATEWAY_RESOURCE_URL
} = require('./config');

class Messenger {
  static async sendAuthorizationPayloadToGateway(encryptedPayload) {
    const data = {
      payload: encryptedPayload
    };
    return await HttpUtil.post(GATEWAY_AUTHZ_URL, data);
  }

  static async seedEtherToService(serviceAddress) {
    const url = ADMIN_SEED_ETHER_URL + '/?address=' + serviceAddress;
    return await HttpUtil.get(url);
  }

  static async getContractAbi() {
    return await HttpUtil.get(ADMIN_ABI_URL);
  }

  static async getAccessList(address) {
    const data = {
      address: address
    };
    return await HttpUtil.post(GATEWAY_ACCESS_LIST_URL, data);
  }

  static async getGatewayInfo() {
    return await HttpUtil.get(ADMIN_GATEWAY_INFO_URL);
  }
}

module.exports = Messenger;