const axios = require('axios').default;
const chalk = require('chalk');

const {
  ISP_LIST_URL,
  ABI_URL,
  ETHER_URL,
  ISP_AUTHN_URL
} = require('./config');

class HttpUtil {
  static async sendRequest(options) {
    try {
      return await axios(options);
    } catch (err) {
      console.log(chalk.red(`Error sending request ${err}`));
      throw new Error(`Error sending request ${err}`);
    }
  }

  static convertStringToBase64(string) {
    return Buffer.from(string).toString('base64');
  }

  static convertBase64ToString(base64) {
    return Buffer.from(base64, 'base64').toString('ascii');
  }

  static async getContractAbi() {
    const options = {
      method: 'get',
      url: ABI_URL
    };

    const response = await HttpUtil.sendRequest(options);
    return response.data;
  }

  static async assignEther(address) {
    const options = {
      method: 'post',
      url: ETHER_URL,
      data: {
        address: address
      }
    }

    const response = await HttpUtil.sendRequest(options);
    return response.data;
  }

  static async getIspInfo() {
    const options = {
      method: 'get',
      url: ISP_LIST_URL
    };

    const response = await HttpUtil.sendRequest(options);
    return response.data;
  }

  static async registerISP(address, publicKey) {
    const options = {
      method: 'post',
      url: ISP_LIST_URL,
      data: {
        address: address,
        publicKey: publicKey
      }
    }
  
    const response = await HttpUtil.sendRequest(options);
    return response.data;
  }

  static async sendAuthPayloadToIsp(payload) {
    const options = {
      method: 'post',
      url: ISP_AUTHN_URL,
      data: {
        payload: payload
      }
    };

    const response = await HttpUtil.sendRequest(options);
    return response.data;
  }
}

module.exports = HttpUtil;