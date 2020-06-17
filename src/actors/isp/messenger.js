const HttpUtil = require('../utils/http-util');

const {
  ADMIN_ABI_URL,
  ADMIN_SEED_ETHER_URL
} = require('./config');

class Messenger {
  static async assignEtherToIsp(ispAddress) {
    const data = {
      address: ispAddress
    };
    return await HttpUtil.post(ADMIN_SEED_ETHER_URL, data);
  }

  static async getContractAbi() {
    return await HttpUtil.get(ADMIN_ABI_URL);
  }
}

module.exports = Messenger;