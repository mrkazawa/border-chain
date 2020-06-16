const axios = require('axios').default;
const chalk = require('chalk');
const log = console.log;

class HttpUtil {
  static async sendRequest(options) {
    try {
      return await axios(options);
    } catch (err) {
      log(chalk.red(`Error sending request ${err}`));
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
}

module.exports = HttpUtil;