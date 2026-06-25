/**
 * 后端核心库主入口
 *
 * 快速垂直切分版本 - 直接迁移现有代码
 *
 * @author Backend Team
 * @version 1.0.0
 */

module.exports = {
  // 核心基类模块
  Core: require("./src/core"),

  // Express 应用模块
  App: require("./src/app/createApp"),

  // 响应格式化模块
  Response: require("./src/response"),

  // 中间件模块
  Middleware: require("./src/middleware"),

  // 工具函数模块
  Utils: require("./src/utils"),

  // 通用服务模块
  Services: require("./src/services"),

  // 缓存模块
  Cache: require("./src/cache"),

  // 认证模块
  Auth: require("./src/auth"),

  // Mixins 模块
  Mixins: require("./src/mixins"),

  // 代码生成器模块
  Generators: require("./src/generators"),

  // 测试框架模块
  Testing: require("./src/testing"),

  // 版本信息
  version: require("./package.json").version,
};
