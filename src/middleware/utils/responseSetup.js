/**
 * 响应设置工具
 * 从原 client.middleware.js 中提取，保持功能完全一致
 */

const ResponseFormatter = require("../../response/ResponseFormatter");
const { CLIENT_FORMATTER_MAPPING } = require("../../config/constants");

// 使用延迟实例化，确保能使用全局配置
let sharedFormatterInstance = null;
const getSharedFormatter = () => {
  if (!sharedFormatterInstance) {
    sharedFormatterInstance = new ResponseFormatter(); // 自动使用全局配置
  }
  return sharedFormatterInstance;
};

// 提供重置方法，当全局配置变更时可以重置实例
const resetFormatter = () => {
  sharedFormatterInstance = null;
};

/**
 * 设置客户端格式化类型
 * @param {string} clientType - 客户端类型
 * @returns {string} 格式化类型
 */
function setupClientFormatterType(clientType) {
  return CLIENT_FORMATTER_MAPPING[clientType] || "default";
}

/**
 * 设置响应头
 * @param {Object} res - Express响应对象
 * @param {string} clientFormatterType - 客户端格式化类型
 */
function setupResponseHeaders(res, clientFormatterType) {
  // 设置响应头（修复拼写错误：Formate → Format）
  res.set("X-Client-Format-Type", clientFormatterType);
}

/**
 * 设置多端定制化响应功能（保持原有逻辑）
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 */
function setupFormatResponse(req, res) {
  // 添加多端定制化响应功能（核心价值保留）
  res.formatResponse = function (serviceResult, responseType = "entity") {
    // 这个方法可以在控制器中直接调用
    // 例如: return res.formatResponse(result, 'pagination');
    const controller = req.controller; // 需要在路由中设置
    if (controller && controller.handleConfigurableResponse) {
      return controller.handleConfigurableResponse(res, serviceResult, responseType);
    } else {
      // 降级处理：直接使用 ResponseFormatter
      const formatter = getSharedFormatter();
      const internalResponse = {
        type: responseType,
        success: true,
        data: serviceResult.data || serviceResult,
        message: serviceResult.message || "操作成功",
      };
      return formatter.formatResponse(res, internalResponse);
    }
  };
}

/**
 * 完整的响应设置（保持原有功能）
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @param {string} clientType - 客户端类型
 */
function setupResponse(req, res, clientType) {
  // 1. 设置兼容格式（用于多端响应系统）
  const clientFormatterType = setupClientFormatterType(clientType);
  req.clientFormatterType = clientFormatterType;

  // 2. 设置响应头
  setupResponseHeaders(res, clientFormatterType);

  // 3. 设置多端定制化响应功能
  setupFormatResponse(req, res);
}

module.exports = {
  getSharedFormatter,
  resetFormatter,
  setupClientFormatterType,
  setupResponseHeaders,
  setupFormatResponse,
  setupResponse
};
