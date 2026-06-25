/**
 * 中间件模块导出
 */

module.exports = {
  // 认证相关中间件
  auth: require("./auth.middleware"),
  admin: require("./admin.middleware"),

  // 错误处理中间件
  error: require("./error.middleware"),

  // 客户端检测中间件
  client: require("./client.middleware"),

  // 调试中间件
  debug: require("./debugMiddleware"),
};
