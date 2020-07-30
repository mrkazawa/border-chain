const axios = require('axios').default;
const chalk = require('chalk');
const log = console.log;

class HttpUtil {
  static async sendRequest(options) {
    try {
      return await axios(options);
    } catch (error) {
      if (error.response) {
        /*
         * The request was made and the server responded with a
         * status code that falls out of the range of 2xx
         */
        log(chalk.redBright('Error status: ', error.response.status));
        log(chalk.redBright('Error message: ', error.response.data));
      } else if (error.request) {
        /*
         * The request was made but no response was received, `error.request`
         * is an instance of XMLHttpRequest in the browser and an instance
         * of http.ClientRequest in Node.js
         */
        log(chalk.redBright('Error when requesting: ', error.request));
      } else {
        // Something happened in setting up the request and triggered an Error
        log(chalk.redBright('Error when setting up: ', error.message));
      }
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