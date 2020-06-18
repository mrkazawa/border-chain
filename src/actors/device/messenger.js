const HttpUtil = require('../utils/http-util');

const {
  ADMIN_DEVICE_LIST_URL,
  GATEWAY_AUTHN_URL
} = require('./config');

class Messenger {
  static async sendAuthenticationPayloadToGateway(authPayload) {
    const data = {
      payload: authPayload
    };
    return await HttpUtil.post(GATEWAY_AUTHN_URL, data);
  }

  static async getDeviceInfo() {
    return await HttpUtil.get(ADMIN_DEVICE_LIST_URL);
  }
}

module.exports = Messenger;