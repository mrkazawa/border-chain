const HttpUtil = require('../utils/http-util');

const {
  ADMIN_ABI_URL,
  ADMIN_GATEWAY_LIST_URL,
  ADMIN_SEED_ETHER_URL,
  ISP_AUTHN_URL,
  ISP_USER_REGISTRATION_URL
} = require('./config');

class Messenger {
  static async sendAuthenticationPayloadToIsp(encryptedPayload) {
    const data = {
      payload: encryptedPayload
    };
    return await HttpUtil.post(ISP_AUTHN_URL, data);
  }

  static async sendUserRegistrationToIsp(address, username, password) {
    const data = {
      address: address,
      username: username,
      password: password
    };
    return await HttpUtil.post(ISP_USER_REGISTRATION_URL, data);
  }

  static async registerGatewayToAdmin(address, publicKey, privateKey) {
    const data = {
      address: address,
      publicKey: publicKey,
      privateKey: privateKey
    };
    return await HttpUtil.post(ADMIN_GATEWAY_LIST_URL, data);
  }

  static async assignEtherToOwner(ownerAddress) {
    const data = {
      address: ownerAddress
    };
    return await HttpUtil.post(ADMIN_SEED_ETHER_URL, data);
  }

  static async getContractAbi() {
    return await HttpUtil.get(ADMIN_ABI_URL);
  }
}

module.exports = Messenger;