/**
 * 响应格式配置 - 整合版
 *
 * 支持当前实际存在的客户端响应格式需求
 * 基于实际配置情况，只包含真正实现的格式类型
 *
 * @author Investment Platform Team
 * @version 2.2.0 (整合版)
 * @since 2024-06-21
 * @updated 2025-07-06
 */

// 客户端格式化类型枚举（与 constants.js 保持一致）
const CLIENT_FORMATTERS = {
  DEFAULT: "default",
  WEB_ADMIN: "web_admin",
  // 注意：不包含 mobile, miniapp 等未实现的格式
};

// 响应类型枚举
const RESPONSE_TYPES = {
  ENTITY: "entity",
  LIST: "list",
  PAGINATION: "pagination",
  OPERATION: "operation",
  ENTITY_OPERATION: "entityOperation",
  ERROR: "error",
};

module.exports = {
  // 默认响应格式（通用格式）
  default: {
    // 单条记录响应格式
    entity: {
      template: {
        success: true,
        code: "SUCCESS",
        message: "",
        data: null,
        timestamp: () => Date.now(),
      },
      mapping: {
        data: "data",
      },
    },

    // 列表响应格式（不分页）
    list: {
      template: {
        success: true,
        code: "SUCCESS",
        message: "",
        data: {
          list: [],
          total: 0,
        },
        timestamp: () => Date.now(),
      },
      mapping: {
        "data.list": "data.items",
        "data.total": "data.total",
      },
    },

    // 分页列表响应格式
    pagination: {
      template: {
        success: true,
        code: "SUCCESS",
        message: "",
        data: {
          list: [], // 数据列表
          total: 0, // 总记录数
          page: 1, // 当前页码
          pageSize: 20, // 每页大小
          totalPages: 0, // 总页数
        },
        timestamp: () => Date.now(),
      },
      mapping: {
        "data.list": "data.items",
        "data.total": "data.pagination.total",
        "data.page": "data.pagination.page",
        "data.pageSize": "data.pagination.limit",
        "data.totalPages": "data.pagination.totalPages",
      },
      computed: {
        "data.totalPages": (data) => {
          // 如果原始数据中已有pages字段，则不计算（优先使用原始数据）
          if (data.pagination && data.pagination.pages !== undefined) {
            return data.pagination.pages;
          }
          // 如果没有pages字段，则计算
          const total = data.pagination?.total || 0;
          const limit = data.pagination?.limit || 20;
          return Math.ceil(total / limit);
        },
      },
    },

    // 操作结果响应格式（增删改操作）
    operation: {
      template: {
        success: true,
        code: "SUCCESS",
        message: "",
        data: {
          affected: 0, // 影响的记录数
          id: null, // 新创建的ID（创建操作时）
          ids: null, // 批量操作的ID数组
        },
        timestamp: () => Date.now(),
      },
      mapping: {
        "data.affected": "data.affected",
        "data.id": "data.id",
        "data.ids": "data.ids",
      },
    },

    // 实体操作响应格式（create/update操作，返回实体+操作信息）
    entityOperation: {
      template: {
        success: true,
        code: "SUCCESS",
        message: "",
        data: {
          entity: null, // 主要实体数据
          operation: {
            // 操作元数据
            affected: 0,
            id: null,
            ids: null,
          },
        },
        timestamp: () => Date.now(),
      },
      mapping: {
        "data.entity": "data.entity",
        "data.operation.affected": "data.operation.affected",
        "data.operation.id": "data.operation.id",
        "data.operation.ids": "data.operation.ids",
      },
    },

    // 错误响应格式
    error: {
      template: {
        success: false,
        code: "",
        message: "",
        data: null,
        timestamp: () => Date.now(),
      },
      mapping: {
        code: "code",
        message: "message",
        data: "data",
      },
    },
  },

  // Web管理后台专用格式（针对前端需求优化）
  web_admin: {
    // 单条记录响应格式
    entity: {
      template: {
        success: true,
        code: "SUCCESS",
        message: "",
        data: null,
        timestamp: () => Date.now(),
      },
      mapping: {
        data: "",
      },
    },

    // 列表响应格式（不分页）
    list: {
      template: {
        success: true,
        code: "SUCCESS",
        message: "",
        data: {
          list: [],
          total: 0,
        },
        timestamp: () => Date.now(),
      },
      mapping: {
        "data.list": "data.items",
        "data.total": "data.total",
      },
      computed: {},
    },

    // 分页列表响应格式（适配前端 DataParser）
    pagination: {
      template: {
        success: true,
        code: "SUCCESS",
        message: "",
        data: {
          list: [],
          total: 0,
          page: 1,
          pageSize: 20,
          totalPages: 0,
          pagination: {
            page: 1,
            limit: 20,
            total: 0,
            pages: 0,
          },
        },
        timestamp: () => Date.now(),
      },
      mapping: {
        "data.list": "data.items",
        "data.total": "data.pagination.total",
        "data.page": "data.pagination.page",
        "data.pageSize": "data.pagination.limit",
        "data.totalPages": "data.pagination.totalPages",
      },
      computed: {},
    },

    // 操作结果响应格式
    operation: {
      template: {
        success: true,
        code: "SUCCESS",
        message: "",
        data: {
          affected: 0,
          id: null,
          ids: null,
        },
        timestamp: () => Date.now(),
      },
      mapping: {
        "data.affected": "data.affected",
        "data.id": "data.id",
        "data.ids": "data.ids",
      },
    },

    // 实体操作响应格式（create/update操作，返回实体+操作信息）
    entityOperation: {
      template: {
        success: true,
        code: "SUCCESS",
        message: "",
        data: {
          entity: null, // 主要实体数据
          operation: {
            // 操作元数据
            affected: 0,
            id: null,
            ids: null,
          },
        },
        timestamp: () => Date.now(),
      },
      mapping: {
        "data.entity": "data.entity",
        "data.operation.affected": "data.operation.affected",
        "data.operation.id": "data.operation.id",
        "data.operation.ids": "data.operation.ids",
      },
    },

    // 错误响应格式
    error: {
      template: {
        success: false,
        code: "",
        message: "",
        data: null,
        timestamp: () => Date.now(),
      },
      mapping: {
        code: "code",
        message: "message",
        data: "data",
      },
    },
  },
};

/**
 * 获取响应格式配置
 * @param {string} clientType 客户端类型 (default, web_admin)
 * @param {string} responseType 响应类型 (entity, list, pagination)
 * @returns {Object} 响应格式配置对象
 */
function getResponseFormat(clientType = "default", responseType = "entity") {
  const config = module.exports[clientType] || module.exports.default;
  return config[responseType] || config.entity;
}

/**
 * 设置对象深层属性值
 * @param {Object} obj 目标对象
 * @param {string} path 属性路径，如 'data.records'
 * @param {any} value 要设置的值
 */
function setDeepProperty(obj, path, value) {
  const keys = path.split(".");
  let current = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current) || typeof current[key] !== "object") {
      current[key] = {};
    }
    current = current[key];
  }

  current[keys[keys.length - 1]] = value;
}

/**
 * 获取对象深层属性值
 * @param {Object} obj 源对象
 * @param {string} path 属性路径，如 'data.total'
 * @returns {any} 属性值
 */
function getDeepProperty(obj, path) {
  return path.split(".").reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : undefined;
  }, obj);
}

// 导出工具函数
module.exports.getResponseFormat = getResponseFormat;
module.exports.setDeepProperty = setDeepProperty;
module.exports.getDeepProperty = getDeepProperty;

// 导出常量枚举
module.exports.CLIENT_FORMATTERS = CLIENT_FORMATTERS;
module.exports.RESPONSE_TYPES = RESPONSE_TYPES;
