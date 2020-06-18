const HttpUtil = require('../utils/http-util');

const {
  ADMIN_ABI_URL,
  ADMIN_SEED_ETHER_URL,
  ADMIN_ISP_INFO_URL
} = require('./config');

class Messenger {
  static async seedEtherToIsp(ispAddress) {
    const url = ADMIN_SEED_ETHER_URL + '/?address=' + ispAddress;
    return await HttpUtil.get(url);
  }

  static async registerIspToAdmin(isp) {
    const data = isp;
    return await HttpUtil.post(ADMIN_ISP_INFO_URL, data);
  }

  static async getContractAbi() {
    return await HttpUtil.get(ADMIN_ABI_URL);
  }
}

module.exports = Messenger;