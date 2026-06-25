/**
 * 认证模块入口
 *
 * 提供统一的认证和权限管理功能
 *
 * @author Backend Core Lib Team
 * @version 1.0.0
 * @since 2024-07-16
 */

const PermissionManager = require("./PermissionManager");
const TokenSecurityManager = require("./TokenSecurityManager");

module.exports = {
  PermissionManager,
  TokenSecurityManager,
};
