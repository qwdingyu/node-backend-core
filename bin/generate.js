#!/usr/bin/env node

/**
 * 代码生成CLI工具
 * 提供命令行接口生成Controller/Service/Model代码
 *
 * @author Backend Team
 * @version 1.0.0
 * @since 2024-06-24
 */

const CodeGenerator = require("../src/generators/CodeGenerator");
const path = require("path");

class GeneratorCLI {
  constructor() {
    this.generator = new CodeGenerator();
  }

  /**
   * 运行CLI
   */
  run() {
    const args = process.argv.slice(2);

    if (args.length === 0) {
      this.showHelp();
      return;
    }

    const command = args[0];
    const name = args[1];

    if (!name) {
      console.error("❌ 错误: 请提供模块名称");
      this.showHelp();
      process.exit(1);
    }

    // 验证模块名称格式
    if (!/^[A-Z][a-zA-Z0-9]*$/.test(name)) {
      console.error("❌ 错误: 模块名称必须以大写字母开头，只能包含字母和数字");
      process.exit(1);
    }

    try {
      switch (command) {
        case "controller":
          this.generateController(name, this.parseOptions(args.slice(2)));
          break;
        case "service":
          this.generateService(name, this.parseOptions(args.slice(2)));
          break;
        case "model":
          this.generateModel(name, this.parseOptions(args.slice(2)));
          break;
        case "routes":
          this.generateRoutes(name, this.parseOptions(args.slice(2)));
          break;
        case "crud":
          this.generateCRUD(name, this.parseOptions(args.slice(2)));
          break;
        default:
          console.error(`❌ 错误: 未知命令 "${command}"`);
          this.showHelp();
          process.exit(1);
      }
    } catch (error) {
      console.error("❌ 生成失败:", error.message);
      process.exit(1);
    }
  }

  /**
   * 生成控制器
   */
  generateController(name, options) {
    console.log(`🏭 生成 ${name} 控制器...`);

    const outputPath = options.output || path.join(process.cwd(), "src", "controllers", `${name}Controller.js`);

    this.generator.generateController(name, {
      outputPath,
      includeComments: options.comments !== false,
      includeValidation: options.validation !== false,
    });
  }

  /**
   * 生成服务
   */
  generateService(name, options) {
    console.log(`🏭 生成 ${name} 服务...`);

    const outputPath = options.output || path.join(process.cwd(), "src", "services", `${name}Service.js`);

    this.generator.generateService(name, {
      outputPath,
      includeCache: options.cache === true,
      includeTransaction: options.transaction !== false,
    });
  }

  /**
   * 生成模型
   */
  generateModel(name, options) {
    console.log(`🏭 生成 ${name} 模型...`);

    const outputPath = options.output || path.join(process.cwd(), "src", "models", `${name}.js`);

    this.generator.generateModel(name, {
      outputPath,
      fields: options.fields || [],
      tableName: options.table,
    });
  }

  /**
   * 生成路由
   */
  generateRoutes(name, options) {
    console.log(`🏭 生成 ${name} 路由...`);

    const outputPath = options.output || path.join(process.cwd(), "src", "routes", `${name.toLowerCase()}.routes.js`);

    this.generator.generateRoutes(name, {
      outputPath,
      prefix: options.prefix || "api",
      includeAuth: options.auth !== false,
    });
  }

  /**
   * 生成完整CRUD
   */
  generateCRUD(name, options) {
    console.log(`🏭 生成 ${name} 完整CRUD模块...`);

    const outputDir = options.output || path.join(process.cwd(), "src");

    this.generator.generateCRUD(name, {
      outputDir,
      fields: options.fields || [],
      includeRoutes: options.routes !== false,
      includeCache: options.cache === true,
      includeValidation: options.validation !== false,
      prefix: options.prefix || "api",
    });
  }

  /**
   * 解析命令行选项
   */
  parseOptions(args) {
    const options = {};

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];

      if (arg.startsWith("--")) {
        const key = arg.slice(2);
        const nextArg = args[i + 1];

        if (nextArg && !nextArg.startsWith("--")) {
          options[key] = nextArg;
          i++; // 跳过下一个参数
        } else {
          options[key] = true;
        }
      }
    }

    return options;
  }

  /**
   * 显示帮助信息
   */
  showHelp() {
    console.log(`
🏭 Backend Core Library 代码生成器
=====================================

用法:
  node bin/generate.js <command> <ModuleName> [options]

命令:
  controller <Name>     生成控制器
  service <Name>        生成服务
  model <Name>          生成模型
  routes <Name>         生成路由
  crud <Name>           生成完整CRUD模块

选项:
  --output <path>       指定输出路径
  --table <name>        指定数据表名称（仅模型）
  --prefix <prefix>     指定路由前缀（默认: api）
  --no-auth            不包含认证中间件
  --no-routes          不生成路由文件（仅CRUD）
  --no-validation      不包含验证代码
  --no-comments        不包含注释
  --cache              包含缓存功能
  --transaction        包含事务支持

示例:
  # 生成用户控制器
  node bin/generate.js controller User

  # 生成带缓存的用户服务
  node bin/generate.js service User --cache

  # 生成用户模型并指定表名
  node bin/generate.js model User --table user_info

  # 生成完整的用户CRUD模块
  node bin/generate.js crud User

  # 生成产品CRUD模块到指定目录
  node bin/generate.js crud Product --output ./modules

注意:
  - 模块名称必须以大写字母开头（如：User, Product, OrderItem）
  - 生成的文件会自动创建必要的目录结构
  - 如果文件已存在，将会被覆盖

更多信息请参考文档: https://github.com/usethink/node-backend-core
`);
  }
}

// 运行CLI
if (require.main === module) {
  const cli = new GeneratorCLI();
  cli.run();
}

module.exports = GeneratorCLI;
