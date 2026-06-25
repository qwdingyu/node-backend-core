/**
 * 响应格式化模块导出
 *
 * 统一导出所有响应相关的工具类
 *
 * @author Investment Platform Team
 * @version 1.0.0
 * @since 2024-07-16
 */

module.exports = {
  // 统一响应格式化器
  UnifiedResponseFormatter: require("./UnifiedResponseFormatter"),

  // 响应格式化器（支持多客户端适配）
  ResponseFormatter: require("./ResponseFormatter"),

  // 响应构建器
  ResponseBuilder: require("./ResponseBuilder"),

  // 响应助手
  ResponseHelpers: require("./ResponseHelpers"),
};
