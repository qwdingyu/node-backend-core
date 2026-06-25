/**
 * Express 应用工厂函数
 *
 * MVP设计：提供简单的应用创建接口
 *
 * @author Backend Core Team
 * @version 1.0.0
 * @since 2024-12-21
 */

const ExpressApp = require("./ExpressApp");

/**
 * 深度合并配置对象 配置优先级：环境变量 > 项目配置 > 默认配置
 * @param {Object} target 目标对象
 * @param {Object} source 源对象
 * @returns {Object} 合并后的对象
 */
function _deepMergeConfig(target, source) {
  const result = { ...target };

  for (const key in source) {
    if (source[key] && typeof source[key] === "object" && !Array.isArray(source[key])) {
      result[key] = _deepMergeConfig(target[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }

  return result;
}

/**
 * 创建 Express 应用
 *
 * @param {Object} options 配置选项
 * @param {Object} options.config 应用配置
 * @param {Object} options.services 服务依赖（sequelize, models等）
 * @param {Array} options.middlewares 中间件列表
 * @param {Array} options.routes 路由列表
 * @returns {ExpressApp} Express应用实例
 */
function createApp(options = {}) {
  const { config = {}, services = {}, middlewares = [], routes = [] } = options;

  // 创建应用实例
  const app = new ExpressApp(config);

  // 设置服务依赖
  if (Object.keys(services).length > 0) {
    app.setServices(services);
  }

  // 添加中间件
  middlewares.forEach((middleware) => {
    if (typeof middleware === "object" && middleware.handler) {
      app.addMiddleware(middleware.handler, middleware.options);
    } else {
      app.addMiddleware(middleware);
    }
  });

  // 添加路由
  routes.forEach((route) => {
    if (typeof route === "object" && route.path && route.router) {
      app.addRoutes(route.path, route.router);
    }
  });

  return app;
}

/**
 * 快速创建并启动应用
 *
 * @param {Object} options 配置选项
 * @returns {Promise<Server>} HTTP服务器实例
 */
async function createAndStartApp(options = {}) {
  const app = createApp(options);
  return await app.start();
}

/**
 * 创建标准的业务应用
 * 适用于面向用户的业务系统，支持高并发访问
 *
 * @param {Object} options 配置选项
 * @returns {ExpressApp} Express应用实例
 */
function createBusinessApp(options = {}) {
  const defaultConfig = {
    cors: {
      origin: process.env.NODE_ENV === "production" ? process.env.BUSINESS_CORS_ORIGIN?.split(",") || false : true,
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Origin", "Content-Type", "Authorization", "X-Token"],
    },
    security: {
      rateLimit: {
        windowMs: 15 * 60 * 1000, // 15分钟
        max: process.env.BUSINESS_RATE_LIMIT || 1000, // 业务应用高限制
        message: {
          success: false,
          code: "RATE_LIMIT_EXCEEDED",
          message: "请求过于频繁，请稍后再试",
        },
      },
      helmet: {
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https:"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "https:"],
          },
        },
      },
    },
  };

  return createApp({
    ...options,
    config: _deepMergeConfig(defaultConfig, options.config || {}),
  });
}

/**
 * 创建管理后台应用
 * 包含更严格的安全配置
 *
 * @param {Object} options 配置选项
 * @returns {ExpressApp} Express应用实例
 */
function createAdminApp(options = {}) {
  const defaultConfig = {
    cors: {
      origin: process.env.ADMIN_CORS_ORIGIN
        ? process.env.ADMIN_CORS_ORIGIN.split(",").map((o) => o.trim())
        : process.env.NODE_ENV === "production"
        ? ["https://admin.yourdomain.com"]
        : ["http://localhost:3001", "http://127.0.0.1:3001"],
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE"], // 不包含 OPTIONS，更严格
      allowedHeaders: ["Origin", "Content-Type", "Authorization", "X-Admin-Token"],
    },
    security: {
      rateLimit: {
        windowMs: 15 * 60 * 1000,
        max: process.env.ADMIN_RATE_LIMIT || 200,
        message: {
          success: false,
          code: "ADMIN_RATE_LIMIT_EXCEEDED",
          message: "管理操作过于频繁，请稍后再试",
        },
      },
      helmet: {
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:"],
            connectSrc: ["'self'"],
            frameAncestors: ["'none'"],
          },
        },
      },
    },
  };

  return createApp({
    ...options,
    config: _deepMergeConfig(defaultConfig, options.config || {}),
  });
}

/**
 * 应用配置预设
 */
const presets = {
  /**
   * 开发环境预设
   */
  development: {
    cors: {
      origin: true,
      credentials: true,
    },
    security: {
      rateLimit: {
        max: 10000, // 开发环境放宽限制
      },
    },
    logging: {
      level: "debug",
    },
  },

  /**
   * 生产环境预设
   */
  production: {
    cors: {
      origin: false, // 需要明确配置
      credentials: true,
    },
    security: {
      helmet: {
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
          },
        },
      },
      rateLimit: {
        max: 100,
      },
    },
    logging: {
      level: "warn",
    },
  },

  /**
   * 测试环境预设
   */
  test: {
    cors: {
      origin: true,
    },
    security: {
      rateLimit: {
        max: 10000,
      },
    },
    logging: {
      enabled: false,
    },
  },
};

/**
 * 使用预设配置创建应用
 *
 * @param {string} preset 预设名称 (development, production, test)
 * @param {Object} options 额外配置选项
 * @returns {ExpressApp} Express应用实例
 */
function createAppWithPreset(preset, options = {}) {
  const presetConfig = presets[preset] || presets.development;

  const mergedConfig = {
    ...presetConfig,
    ...options.config,
  };

  return createApp({
    ...options,
    config: mergedConfig,
  });
}

module.exports = {
  createApp,
  createAndStartApp,
  createBusinessApp,
  createAdminApp,
  createAppWithPreset,
  presets,
  ExpressApp,
};
