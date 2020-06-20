const HttpUtil = require('../utils/http-util');

const {
  ADMIN_DEVICE_INFO_URL,
  ADMIN_ABI_URL,
  ADMIN_SEED_ETHER_URL,
  ADMIN_VENDOR_INFO_URL
} = require('./config');

class Messenger {
  static async registerDeviceToAdmin(deviceProperties) {
    const data = deviceProperties;
    return await HttpUtil.post(ADMIN_DEVICE_INFO_URL, data);
  }

  static async registerVendorToAdmin(vendor) {
    const data = vendor;
    return await HttpUtil.post(ADMIN_VENDOR_INFO_URL, data);
  }

  static async seedEtherToVendor(vendorAddress) {
    const url = ADMIN_SEED_ETHER_URL + '/?address=' + vendorAddress;
    return await HttpUtil.get(url);
  }

  static async getContractAbi() {
    return await HttpUtil.get(ADMIN_ABI_URL);
  }
}

module.exports = Messenger;