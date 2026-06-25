const axios = require("axios");
const querystring = require("querystring");

class HttpUtil {
  /**
   * 发送GET请求
   * @param {string} url - 请求URL
   * @param {Object} params - 请求参数
   * @param {Object} headers - 请求头
   * @returns {Promise<Object>} - 响应数据
   */
  static async get(url, params = {}, headers = {}) {
    try {
      const response = await axios.get(url, {
        params,
        headers,
      });
      return response.data;
    } catch (error) {
      console.error("GET请求错误:", error.message);
      throw error;
    }
  }

  /**
   * 发送POST请求（JSON格式）
   * @param {string} url - 请求URL
   * @param {Object} data - 请求数据
   * @param {Object} headers - 请求头
   * @returns {Promise<Object>} - 响应数据
   */
  static async post(url, data = {}, headers = {}) {
    try {
      const response = await axios.post(url, data, { headers });
      return response.data;
    } catch (error) {
      console.error("POST请求错误:", error.message);
      throw error;
    }
  }

  /**
   * 发送POST请求（表单格式，兼容PHP的httpPost函数）
   * @param {string} url - 请求URL
   * @param {Object|string} data - 请求数据，可以是对象或已格式化的字符串
   * @param {Object} headers - 请求头
   * @returns {Promise<Object|string>} - 响应数据
   */
  static async postForm(url, data = {}, headers = {}) {
    try {
      const formData =
        typeof data === "string" ? data : querystring.stringify(data);
      const response = await axios.post(url, formData, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          ...headers,
        },
      });
      return response.data;
    } catch (error) {
      console.error("POST表单请求错误:", error.message);
      throw error;
    }
  }

  /**
   * 获取客户端IP地址
   * @param {Object} req - Express请求对象
   * @returns {string} - IP地址
   */
  static getClientIp(req) {
    return (
      req.ip ||
      req.headers["x-forwarded-for"] ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      req.connection.socket.remoteAddress ||
      "0.0.0.0"
    );
  }
}

module.exports = HttpUtil;
