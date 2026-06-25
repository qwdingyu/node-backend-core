/**
 * 客户端配置 - 纯配置数据
 * 
 * 只包含配置数据，不包含任何业务逻辑
 * 所有业务逻辑都在对应的服务类中实现
 * 
 * @author Investment Platform Team
 * @version 3.0.0 (重构版)
 * @since 2025-07-06
 */

/**
 * 客户端类型枚举
 */
const CLIENT_TYPES = {
  ADMIN: "admin",     // 管理后台
  APP: "app",         // 移动APP
  COMMON: "common",   // 通用接口
};

/**
 * 客户端检测配置
 * 定义每种客户端类型的识别规则
 */
const CLIENT_DETECTION_CONFIG = {
  [CLIENT_TYPES.ADMIN]: {
    pathSegments: ["admin"],                    // URL路径段
    headerValues: ["admin", "web_admin"],       // 可接受的header值
    userAgentKeywords: [],                      // User-Agent关键词
    priority: 1,                                // 检测优先级
  },
  
  [CLIENT_TYPES.APP]: {
    pathSegments: ["app"],
    headerValues: ["app", "mobile"],
    userAgentKeywords: ["Mobile", "Android", "iPhone"],
    priority: 2,
  },
  
  [CLIENT_TYPES.COMMON]: {
    pathSegments: [],                           // 不通过路径识别
    headerValues: ["common", "default"],
    userAgentKeywords: [],
    priority: 999,                              // 最低优先级，作为默认值
  },
};

/**
 * 客户端响应格式映射
 * 定义客户端类型到响应格式的映射关系
 */
const CLIENT_FORMATTER_MAPPING = {
  [CLIENT_TYPES.ADMIN]: "web_admin",           // 管理后台 -> web_admin 格式
  [CLIENT_TYPES.APP]: "default",               // 移动APP -> 默认格式（因为mobile格式未定义）
  [CLIENT_TYPES.COMMON]: "default",            // 通用接口 -> 默认格式
};

/**
 * 客户端权限配置
 * 定义每种客户端类型的权限要求
 */
const CLIENT_AUTH_CONFIG = {
  [CLIENT_TYPES.ADMIN]: {
    name: "管理后台",
    requireAuth: true,                          // 需要认证
    requireAdmin: true,                         // 需要管理员权限
    permissions: ["admin", "all"],              // 权限标识
    allowedPaths: ["/api/admin/**"],           // 允许访问的路径模式
  },
  
  [CLIENT_TYPES.APP]: {
    name: "移动APP",
    requireAuth: true,
    requireAdmin: false,
    permissions: ["app", "all"],
    allowedPaths: ["/api/app/**"],
  },
  
  [CLIENT_TYPES.COMMON]: {
    name: "通用接口",
    requireAuth: false,
    requireAdmin: false,
    permissions: ["all"],
    allowedPaths: ["/**"],                      // 允许访问所有路径
  },
};

/**
 * 检测策略配置
 * 定义客户端检测的策略顺序和选项
 */
const DETECTION_STRATEGIES = {
  DEFAULT: ["path", "header", "userAgent", "default"],
  STRICT: ["path", "header", "default"],       // 严格模式，不使用User-Agent
  LOOSE: ["header", "userAgent", "path", "default"], // 宽松模式，优先header
};

/**
 * 支持的响应格式类型
 * 基于实际存在的响应格式配置
 */
const SUPPORTED_FORMATTER_TYPES = {
  DEFAULT: "default",
  WEB_ADMIN: "web_admin",
  // 注意：不包含 mobile, miniapp 等未定义的格式
};

/**
 * 系统默认值配置
 */
const DEFAULTS = {
  CLIENT_TYPE: CLIENT_TYPES.COMMON,
  FORMATTER_TYPE: "default",
  DETECTION_STRATEGY: DETECTION_STRATEGIES.DEFAULT,
  HEADER_FIELDS: ["x-client-type", "client-type", "x-client", "client"],
};

/**
 * 配置验证规则
 * 用于验证配置的完整性和一致性
 */
const CONFIG_VALIDATION_RULES = {
  // 必须存在的客户端类型
  REQUIRED_CLIENT_TYPES: [CLIENT_TYPES.ADMIN, CLIENT_TYPES.APP, CLIENT_TYPES.COMMON],
  
  // 必须存在的格式化类型
  REQUIRED_FORMATTER_TYPES: ["default", "web_admin"],
  
  // 配置字段验证规则
  CLIENT_CONFIG_FIELDS: ["name", "requireAuth", "requireAdmin", "permissions"],
  DETECTION_CONFIG_FIELDS: ["pathSegments", "headerValues", "userAgentKeywords", "priority"],
};

/**
 * 获取所有客户端类型
 * @returns {Array<string>} 客户端类型数组
 */
function getAllClientTypes() {
  return Object.values(CLIENT_TYPES);
}

/**
 * 获取所有支持的格式化类型
 * @returns {Array<string>} 格式化类型数组
 */
function getAllFormatterTypes() {
  return Object.values(SUPPORTED_FORMATTER_TYPES);
}

/**
 * 验证客户端类型是否有效
 * @param {string} clientType 客户端类型
 * @returns {boolean} 是否有效
 */
function isValidClientType(clientType) {
  return getAllClientTypes().includes(clientType);
}

/**
 * 验证格式化类型是否有效
 * @param {string} formatterType 格式化类型
 * @returns {boolean} 是否有效
 */
function isValidFormatterType(formatterType) {
  return getAllFormatterTypes().includes(formatterType);
}

/**
 * 获取默认客户端类型
 * @returns {string} 默认客户端类型
 */
function getDefaultClientType() {
  return DEFAULTS.CLIENT_TYPE;
}

/**
 * 获取默认格式化类型
 * @returns {string} 默认格式化类型
 */
function getDefaultFormatterType() {
  return DEFAULTS.FORMATTER_TYPE;
}

/**
 * 验证配置完整性
 * @returns {Object} 验证结果
 */
function validateConfig() {
  const issues = [];
  const warnings = [];
  
  // 验证必要的客户端类型
  for (const requiredType of CONFIG_VALIDATION_RULES.REQUIRED_CLIENT_TYPES) {
    if (!CLIENT_AUTH_CONFIG[requiredType]) {
      issues.push(`缺少客户端配置: ${requiredType}`);
    }
    if (!CLIENT_DETECTION_CONFIG[requiredType]) {
      issues.push(`缺少检测配置: ${requiredType}`);
    }
    if (!CLIENT_FORMATTER_MAPPING[requiredType]) {
      issues.push(`缺少格式化映射: ${requiredType}`);
    }
  }
  
  // 验证格式化类型映射
  for (const [clientType, formatterType] of Object.entries(CLIENT_FORMATTER_MAPPING)) {
    if (!isValidFormatterType(formatterType)) {
      warnings.push(`客户端 ${clientType} 映射到未定义的格式化类型: ${formatterType}`);
    }
  }
  
  return {
    valid: issues.length === 0,
    issues: issues,
    warnings: warnings,
    summary: `配置验证完成：${issues.length} 个错误，${warnings.length} 个警告`,
  };
}

// 导出所有配置和工具函数
module.exports = {
  // 核心配置
  CLIENT_TYPES,
  CLIENT_DETECTION_CONFIG,
  CLIENT_FORMATTER_MAPPING,
  CLIENT_AUTH_CONFIG,
  
  // 策略和选项配置
  DETECTION_STRATEGIES,
  SUPPORTED_FORMATTER_TYPES,
  DEFAULTS,
  CONFIG_VALIDATION_RULES,
  
  // 工具函数
  getAllClientTypes,
  getAllFormatterTypes,
  isValidClientType,
  isValidFormatterType,
  getDefaultClientType,
  getDefaultFormatterType,
  validateConfig,
};
