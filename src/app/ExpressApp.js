/**
 * Express 应用基础类
 *
 * 简洁设计：标准化多项目的应用初始化流程
 * 遵循"小巧灵活的瑞士军刀"设计理念
 *
 * @author Backend Core Team
 * @version 2.0.0
 * @since 2024-12-21
 */

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const rateLimit = require("express-rate-limit");

/**
 * Express 应用基础类
 * 提供标准化的应用初始化和配置管理
 */
class ExpressApp {
  constructor(options = {}) {
    this.app = express();
    this.config = this._mergeConfig(options);
    this.initialized = false;

    // 存储项目特定的配置
    this.projectConfig = {
      routes: [],
      middlewares: [],
      services: null,
      startupTasks: [], // 启动任务队列
    };
  }

  /**
   * 合并配置 - 简化版本
   */
  _mergeConfig(projectConfig = {}) {
    const defaultConfig = {
      server: {
        port: process.env.PORT || 3000,
        host: process.env.HOST || "0.0.0.0",
      },
      cors: {
        origin: process.env.CORS_ORIGIN?.split(",").map((o) => o.trim()) || true,
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowedHeaders: ["Origin", "X-Requested-With", "Content-Type", "Accept", "Authorization", "X-Token"],
      },
      security: {
        helmet: { contentSecurityPolicy: false }, // 简化安全配置
        rateLimit: {
          windowMs: 15 * 60 * 1000,
          max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
        },
      },
      middleware: {
        compression: true,
        bodyParser: {
          json: { limit: "10mb" },
          urlencoded: { extended: true, limit: "10mb" },
        },
      },
    };

    // 深度合并配置，避免server配置被完全覆盖
    return this._deepMergeConfig(defaultConfig, projectConfig);
  }

  /**
   * 深度合并配置对象
   * @private
   */
  _deepMergeConfig(target, source) {
    const result = { ...target };

    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        if (source[key] && typeof source[key] === "object" && !Array.isArray(source[key])) {
          // 递归合并对象
          result[key] = this._deepMergeConfig(target[key] || {}, source[key]);
        } else {
          // 直接赋值
          result[key] = source[key];
        }
      }
    }

    return result;
  }

  /**
   * 设置服务依赖
   */
  setServices(services = {}) {
    this.projectConfig.services = services;

    // 简化的 BaseService 设置
    if (services.sequelize && services.models) {
      try {
        const Core = require("../core");
        Core.BaseService?.setDefaults?.({
          sequelize: services.sequelize,
          models: services.models,
        });
      } catch (error) {
        console.warn("⚠️  BaseService 设置失败:", error.message);
      }
    }

    return this;
  }

  /**
   * 添加中间件 - 简化版本
   */
  addMiddleware(middleware, options) {
    // 简化的类型检测：null = 直接使用，其他 = 工厂函数
    const config = {
      middleware,
      options,
      isDirect: options === null || (typeof middleware === "function" && middleware.length === 3),
    };

    this.projectConfig.middlewares.push(config);
    return this;
  }

  /**
   * 添加路由
   */
  addRoutes(path, router) {
    this.projectConfig.routes.push({ path, router });
    return this;
  }

  /**
   * 添加启动任务
   * @param {Function} task - 异步任务函数
   * @param {string} name - 任务名称（可选）
   */
  addStartupTask(task, name = null) {
    if (typeof task !== "function") {
      throw new Error("启动任务必须是一个函数");
    }

    this.projectConfig.startupTasks.push({
      task,
      name: name || `Task-${this.projectConfig.startupTasks.length + 1}`,
    });

    return this;
  }

  /**
   * 初始化应用 - 简化版本
   */
  async initialize() {
    if (this.initialized) {
      return this;
    }

    // 1. 基础中间件
    if (this.config.middleware.compression) {
      this.app.use(compression());
    }

    this.app.use(express.json(this.config.middleware.bodyParser.json));
    this.app.use(express.urlencoded(this.config.middleware.bodyParser.urlencoded));

    // 2. 安全中间件
    this.app.use(helmet(this.config.security.helmet));
    this.app.use(cors(this.config.cors));

    if (this.config.security.rateLimit) {
      this.app.use(rateLimit(this.config.security.rateLimit));
    }

    // 3. 项目中间件
    this.projectConfig.middlewares.forEach(({ middleware, options, isDirect }, index) => {
      try {
        const actualMiddleware = isDirect ? middleware : middleware(options || {});
        this.app.use(actualMiddleware);
      } catch (error) {
        console.error(`❌ 中间件 ${index} 注册失败:`, error.message);
        throw error;
      }
    });

    // 4. 健康检查路由
    this.app.get("/health", (_req, res) => {
      res.json({
        status: "ok",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || "development",
      });
    });

    // 5. 项目路由
    this.projectConfig.routes.forEach(({ path, router }) => {
      this.app.use(path, router);
    });

    // 6. 错误处理
    this.app.use((req, res, _next) => {
      res.status(404).json({
        success: false,
        code: "NOT_FOUND",
        message: "请求的资源不存在",
        path: req.originalUrl,
      });
    });

    this.app.use((error, _req, res, _next) => {
      console.error("💥 应用错误:", error);

      // 检查响应是否已经发送，避免重复发送
      if (res.headersSent) {
        console.warn("响应头已发送，跳过应用错误处理");
        return;
      }

      res.status(error.status || 500).json({
        success: false,
        code: error.code || "INTERNAL_ERROR",
        message: process.env.NODE_ENV === "production" ? "服务器内部错误" : error.message,
      });
    });

    this.initialized = true;
    console.log("✅ Express 应用初始化完成");

    return this;
  }

  /**
   * 执行启动任务
   */
  async executeStartupTasks() {
    if (this.projectConfig.startupTasks.length === 0) {
      return;
    }

    console.log(`🚀 执行 ${this.projectConfig.startupTasks.length} 个启动任务...`);

    for (const { task, name } of this.projectConfig.startupTasks) {
      try {
        console.log(`   ⏳ 执行任务: ${name}`);
        await task();
        console.log(`   ✅ 任务完成: ${name}`);
      } catch (error) {
        console.error(`   ❌ 任务失败: ${name}`, error.message);
        throw new Error(`启动任务 ${name} 执行失败: ${error.message}`);
      }
    }

    console.log("✅ 所有启动任务执行完成");
  }

  /**
   * 启动服务器
   */
  async start() {
    if (!this.initialized) {
      await this.initialize();
    }

    // 执行启动任务
    await this.executeStartupTasks();

    return new Promise((resolve, reject) => {
      const server = this.app.listen(this.config.server.port, this.config.server.host, (error) => {
        if (error) {
          reject(error);
        } else {
          console.log(`🌟 服务器启动成功:`);
          console.log(`   地址: http://${this.config.server.host}:${this.config.server.port}`);
          console.log(`   环境: ${process.env.NODE_ENV || "development"}`);
          resolve(server);
        }
      });
    });
  }

  /**
   * 获取 Express 应用实例
   */
  getApp() {
    return this.app;
  }

  /**
   * 获取当前配置
   */
  getConfig() {
    return this.config;
  }
}

module.exports = ExpressApp;
