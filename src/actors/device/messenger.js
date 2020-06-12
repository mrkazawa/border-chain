const HttpUtil = require('../utils/http-util');

const {
  ADMIN_VENDOR_LIST_URL,
  GATEWAY_AUTHN_URL,
  VENDOR_DEVICE_REGISTRATION_URL
} = require('./config');

class Messenger {
  static async sendAuthenticationPayloadToGateway(authPayload) {
    const data = {
      payload: authPayload
    };
    return await HttpUtil.post(GATEWAY_AUTHN_URL, data);
  }

  static async sendDeviceRegistrationToVendor(device) {
    const data = device;
    return await HttpUtil.post(VENDOR_DEVICE_REGISTRATION_URL, data);
  }

  static async getVendorInfo() {
    return await HttpUtil.get(ADMIN_VENDOR_LIST_URL);
  }
}

module.exports = Messenger;