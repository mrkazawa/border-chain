const HttpUtil = require('../utils/http-util');

const {
  ADMIN_DEVICE_LIST_URL,
  ADMIN_ABI_URL,
  ADMIN_SEED_ETHER_URL
} = require('./config');

class Messenger {
  static async registerDeviceToAdmin(deviceProperties) {
    const data = deviceProperties;
    return await HttpUtil.post(ADMIN_DEVICE_LIST_URL, data);
  }

  static async assignEtherToVendor(vendorAddress) {
    const data = {
      address: vendorAddress
    };
    return await HttpUtil.post(ADMIN_SEED_ETHER_URL, data);
  }

  static async getContractAbi() {
    return await HttpUtil.get(ADMIN_ABI_URL);
  }
}

module.exports = Messenger;