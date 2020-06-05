const axios = require('axios').default;
const chalk = require('chalk');

const {
  ADMIN_ISP_LIST_URL,
  ADMIN_VENDOR_LIST_URL,
  ADMIN_GATEWAY_LIST_URL,
  ADMIN_ABI_URL,
  ADMIN_SEED_ETHER_URL,
  ISP_AUTHN_URL,
  VENDOR_AUTHN_URL,
  GATEWAY_AUTHN_URL
} = require('../config');

class HttpUtil {
  static async sendRequest(options) {
    try {
      return await axios(options);
    } catch (err) {
      console.log(chalk.red(`Error sending request ${err}`));
      throw new Error(`Error sending request ${err}`);
    }
  }

  static async get(url) {
    const options = {
      method: 'get',
      url: url
    };

    const response = await HttpUtil.sendRequest(options);
    return response.data;
  }

  static async post(url, data) {
    const options = {
      method: 'post',
      url: url,
      data: data
    }

    const response = await HttpUtil.sendRequest(options);
    return response.data;
  }

  static convertStringToBase64(string) {
    return Buffer.from(string).toString('base64');
  }

  static convertBase64ToString(base64) {
    return Buffer.from(base64, 'base64').toString('ascii');
  }

  static async assignEther(address) {
    const data = {
      address: address
    };

    return await HttpUtil.post(ADMIN_SEED_ETHER_URL, data);
  }

  static async getContractAbi() {
    return await HttpUtil.get(ADMIN_ABI_URL);
  }

  static async getIspInfo() {
    return await HttpUtil.get(ADMIN_ISP_LIST_URL);
  }

  static async getVendorInfo() {
    return await HttpUtil.get(ADMIN_VENDOR_LIST_URL);
  }

  static async getGatewayInfo() {
    return await HttpUtil.get(ADMIN_GATEWAY_LIST_URL);
  }

  static async registerIsp(address, publicKey) {
    const data = {
      address: address,
      publicKey: publicKey
    };

    return await HttpUtil.post(ADMIN_ISP_LIST_URL, data);
  }

  static async registerVendor(address, publicKey) {
    const data = {
      address: address,
      publicKey: publicKey
    };

    return await HttpUtil.post(ADMIN_VENDOR_LIST_URL, data);
  }

  static async registerGateway(address, publicKey) {
    const data = {
      address: address,
      publicKey: publicKey
    };

    return await HttpUtil.post(ADMIN_GATEWAY_LIST_URL, data);
  }

  static async sendAuthenticationPayloadToIsp(payload) {
    const data = {
      payload: payload
    };

    return await HttpUtil.post(ISP_AUTHN_URL, data);
  }

  static async sendAuthenticationPayloadToVendor(payload) {
    const data = {
      payload: payload
    };

    return await HttpUtil.post(VENDOR_AUTHN_URL, data);
  }

  static async sendAuthenticationPayloadToGateway(payload) {
    const data = {
      payload: payload
    };

    return await HttpUtil.post(GATEWAY_AUTHN_URL, data);
  }
}

module.exports = HttpUtil;