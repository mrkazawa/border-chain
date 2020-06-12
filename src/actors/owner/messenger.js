const HttpUtil = require('../utils/http-util');

const {
  ADMIN_ABI_URL,
  ADMIN_ISP_LIST_URL,
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

  static async sendUserRegistrationToIsp(username, password, routerIP) {
    const data = {
      username: username,
      password: password,
      routerIP: routerIP
    };
    return await HttpUtil.post(ISP_USER_REGISTRATION_URL, data);
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

  static async getIspInfo() {
    return await HttpUtil.get(ADMIN_ISP_LIST_URL);
  }
}

module.exports = Messenger;