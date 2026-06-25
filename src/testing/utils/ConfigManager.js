/**
 * 测试配置管理器
 * 负责加载和管理测试配置
 */

const fs = require('fs');
const path = require('path');

class ConfigManager {
  constructor(configPath = null) {
    this.configPath = configPath;
    this.config = this.loadConfig();
  }

  /**
   * 加载配置文件
   */
  loadConfig() {
    // 默认配置
    const defaultConfig = {
      project: {
        name: "测试项目",
        version: "1.0.0",
        rootDir: process.cwd()
      },
      database: {
        modelsPath: "./src/models",
        configPath: "./src/config/database"
      },
      services: {
        basePath: "./src/services",
        autoLoad: true,
        serviceMap: {}
      },
      api: {
        baseURL: "http://localhost:3000",
        timeout: 30000,
        auth: {
          adminCredentials: { username: "admin", password: "admin123" },
          userCredentials: { username: "testuser", password: "test123" },
          loginEndpoint: "/api/auth/login",
          tokenHeader: "Authorization",
          tokenPrefix: "Bearer "
        }
      },
      testData: {
        cleanup: true,
        preserve: ["config", "admin"],
        generators: {}
      },
      reports: {
        formats: ["console", "html", "json"],
        outputDir: "./test-reports",
        includeDetails: true
      },
      concurrency: {
        maxConcurrent: 5,
        timeout: 60000
      }
    };

    // 如果指定了配置文件路径，尝试加载
    if (this.configPath && fs.existsSync(this.configPath)) {
      try {
        const userConfig = require(this.configPath);
        return this.mergeConfig(defaultConfig, userConfig);
      } catch (error) {
        console.warn(`⚠️  无法加载配置文件 ${this.configPath}:`, error.message);
        return defaultConfig;
      }
    }

    // 尝试在当前目录查找常见的配置文件名
    const commonConfigFiles = [
      'test.config.js',
      'testing.config.js',
      'jest.config.js'
    ];

    for (const configFile of commonConfigFiles) {
      const fullPath = path.join(process.cwd(), configFile);
      if (fs.existsSync(fullPath)) {
        try {
          const userConfig = require(fullPath);
          return this.mergeConfig(defaultConfig, userConfig);
        } catch (error) {
          console.warn(`⚠️  无法加载配置文件 ${fullPath}:`, error.message);
        }
      }
    }

    return defaultConfig;
  }

  /**
   * 深度合并配置对象
   */
  mergeConfig(defaultConfig, userConfig) {
    const merged = { ...defaultConfig };

    for (const key in userConfig) {
      if (userConfig.hasOwnProperty(key)) {
        if (typeof userConfig[key] === 'object' && userConfig[key] !== null && !Array.isArray(userConfig[key])) {
          merged[key] = this.mergeConfig(merged[key] || {}, userConfig[key]);
        } else {
          merged[key] = userConfig[key];
        }
      }
    }

    return merged;
  }

  /**
   * 获取配置值
   */
  get(keyPath, defaultValue = null) {
    const keys = keyPath.split('.');
    let current = this.config;

    for (const key of keys) {
      if (current && current.hasOwnProperty(key)) {
        current = current[key];
      } else {
        return defaultValue;
      }
    }

    return current;
  }

  /**
   * 设置配置值
   */
  set(keyPath, value) {
    const keys = keyPath.split('.');
    let current = this.config;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }

    current[keys[keys.length - 1]] = value;
  }

  /**
   * 获取完整配置
   */
  getAll() {
    return this.config;
  }

  /**
   * 验证配置
   */
  validate() {
    const errors = [];

    // 验证必需的配置项
    const requiredPaths = [
      'database.modelsPath',
      'api.baseURL'
    ];

    for (const path of requiredPaths) {
      if (!this.get(path)) {
        errors.push(`缺少必需的配置项: ${path}`);
      }
    }

    // 验证路径是否存在
    const pathsToCheck = [
      this.get('database.modelsPath'),
      this.get('services.basePath')
    ];

    for (const pathToCheck of pathsToCheck) {
      if (pathToCheck && !fs.existsSync(pathToCheck)) {
        errors.push(`路径不存在: ${pathToCheck}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 生成配置文件模板
   */
  generateTemplate(outputPath = './test.config.js') {
    const template = `// 测试配置文件
module.exports = {
  // 项目基础配置
  project: {
    name: "我的项目",
    version: "1.0.0",
    rootDir: __dirname
  },
  
  // 数据库配置
  database: {
    modelsPath: "./src/models",
    configPath: "./src/config/database"
  },
  
  // 服务配置
  services: {
    basePath: "./src/services",
    autoLoad: true,
    serviceMap: {
      // 自定义服务映射
      "auth": "auth.service.js",
      "user": "user.service.js"
    }
  },
  
  // API测试配置
  api: {
    baseURL: "http://localhost:3000",
    timeout: 30000,
    auth: {
      adminCredentials: { username: "admin", password: "admin123" },
      userCredentials: { username: "testuser", password: "test123" },
      loginEndpoint: "/api/auth/login"
    }
  },
  
  // 测试数据配置
  testData: {
    cleanup: true,
    preserve: ["config", "admin"],
    generators: {
      user: () => ({
        username: \`test_user_\${Date.now()}\`,
        email: \`test\${Date.now()}@example.com\`,
        password: "test123456"
      })
    }
  },
  
  // 报告配置
  reports: {
    formats: ["console", "html", "json"],
    outputDir: "./test-reports",
    includeDetails: true
  }
};`;

    fs.writeFileSync(outputPath, template);
    console.log(`✅ 配置文件模板已生成: ${outputPath}`);
  }
}

module.exports = ConfigManager;
