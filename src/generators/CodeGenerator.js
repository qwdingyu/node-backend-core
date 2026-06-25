/**
 * 代码生成器
 * 基于模板生成Controller/Service/Model代码，提升开发效率
 *
 * @author Backend Team
 * @version 1.0.0
 * @since 2024-06-24
 */

const fs = require("fs");
const path = require("path");

class CodeGenerator {
  constructor() {
    this.templates = {
      controller: this._getControllerTemplate(),
      service: this._getServiceTemplate(),
      model: this._getModelTemplate(),
      routes: this._getRoutesTemplate(),
    };
  }

  /**
   * 生成控制器代码
   * @param {string} name 模块名称（如：User）
   * @param {Object} options 生成选项
   * @returns {string} 生成的代码
   */
  generateController(name, options = {}) {
    const { outputPath = null, includeComments = true, includeValidation = true } = options;

    const code = this.templates.controller
      .replace(/\{\{MODULE_NAME\}\}/g, name)
      .replace(/\{\{MODULE_NAME_LOWER\}\}/g, name.toLowerCase())
      .replace(/\{\{MODULE_NAME_CAMEL\}\}/g, this._toCamelCase(name))
      .replace(/\{\{TIMESTAMP\}\}/g, new Date().toISOString())
      .replace(/\{\{INCLUDE_VALIDATION\}\}/g, includeValidation ? this._getValidationCode() : "");

    if (outputPath) {
      this._writeFile(outputPath, code);
      console.log(`✅ 控制器已生成: ${outputPath}`);
    }

    return code;
  }

  /**
   * 生成服务代码
   * @param {string} name 模块名称
   * @param {Object} options 生成选项
   * @returns {string} 生成的代码
   */
  generateService(name, options = {}) {
    const { outputPath = null, includeCache = false, includeTransaction = true } = options;

    const code = this.templates.service
      .replace(/\{\{MODULE_NAME\}\}/g, name)
      .replace(/\{\{MODULE_NAME_LOWER\}\}/g, name.toLowerCase())
      .replace(/\{\{MODULE_NAME_CAMEL\}\}/g, this._toCamelCase(name))
      .replace(/\{\{TIMESTAMP\}\}/g, new Date().toISOString())
      .replace(/\{\{INCLUDE_CACHE\}\}/g, includeCache ? this._getCacheCode() : "")
      .replace(/\{\{INCLUDE_TRANSACTION\}\}/g, includeTransaction ? this._getTransactionCode() : "");

    if (outputPath) {
      this._writeFile(outputPath, code);
      console.log(`✅ 服务已生成: ${outputPath}`);
    }

    return code;
  }

  /**
   * 生成模型代码
   * @param {string} name 模块名称
   * @param {Object} options 生成选项
   * @returns {string} 生成的代码
   */
  generateModel(name, options = {}) {
    const { outputPath = null, fields = [], tableName = null } = options;

    const fieldsCode = fields.length > 0 ? this._generateFieldsCode(fields) : this._getDefaultFieldsCode();
    const tableNameValue = tableName || this._toSnakeCase(name);

    const code = this.templates.model
      .replace(/\{\{MODULE_NAME\}\}/g, name)
      .replace(/\{\{MODULE_NAME_LOWER\}\}/g, name.toLowerCase())
      .replace(/\{\{TABLE_NAME\}\}/g, tableNameValue)
      .replace(/\{\{FIELDS_CODE\}\}/g, fieldsCode)
      .replace(/\{\{TIMESTAMP\}\}/g, new Date().toISOString());

    if (outputPath) {
      this._writeFile(outputPath, code);
      console.log(`✅ 模型已生成: ${outputPath}`);
    }

    return code;
  }

  /**
   * 生成路由代码
   * @param {string} name 模块名称
   * @param {Object} options 生成选项
   * @returns {string} 生成的代码
   */
  generateRoutes(name, options = {}) {
    const { outputPath = null, prefix = "api", includeAuth = true } = options;

    const code = this.templates.routes
      .replace(/\{\{MODULE_NAME\}\}/g, name)
      .replace(/\{\{MODULE_NAME_LOWER\}\}/g, name.toLowerCase())
      .replace(/\{\{MODULE_NAME_PLURAL\}\}/g, this._toPlural(name.toLowerCase()))
      .replace(/\{\{PREFIX\}\}/g, prefix)
      .replace(/\{\{INCLUDE_AUTH\}\}/g, includeAuth ? this._getAuthMiddleware() : "")
      .replace(/\{\{TIMESTAMP\}\}/g, new Date().toISOString());

    if (outputPath) {
      this._writeFile(outputPath, code);
      console.log(`✅ 路由已生成: ${outputPath}`);
    }

    return code;
  }

  /**
   * 生成完整CRUD模块
   * @param {string} name 模块名称
   * @param {Object} options 生成选项
   */
  generateCRUD(name, options = {}) {
    const { outputDir = process.cwd(), fields = [], includeRoutes = true } = options;

    console.log(`🏭 开始生成 ${name} 模块的完整CRUD代码...`);

    // 生成控制器
    const controllerPath = path.join(outputDir, "controllers", `${name}Controller.js`);
    this.generateController(name, { outputPath: controllerPath, ...options });

    // 生成服务
    const servicePath = path.join(outputDir, "services", `${name}Service.js`);
    this.generateService(name, { outputPath: servicePath, ...options });

    // 生成模型
    const modelPath = path.join(outputDir, "models", `${name}.js`);
    this.generateModel(name, { outputPath: modelPath, fields, ...options });

    // 生成路由（可选）
    if (includeRoutes) {
      const routesPath = path.join(outputDir, "routes", `${name.toLowerCase()}.routes.js`);
      this.generateRoutes(name, { outputPath: routesPath, ...options });
    }

    console.log(`🎉 ${name} 模块CRUD代码生成完成！`);
    console.log(`📁 生成文件:`);
    console.log(`   - 控制器: ${controllerPath}`);
    console.log(`   - 服务: ${servicePath}`);
    console.log(`   - 模型: ${modelPath}`);
    if (includeRoutes) {
      const routesPath = path.join(outputDir, "routes", `${name.toLowerCase()}.routes.js`);
      console.log(`   - 路由: ${routesPath}`);
    }
  }

  // ==================== 私有方法 ====================

  /**
   * 控制器模板
   * @private
   */
  _getControllerTemplate() {
    return `/**
 * {{MODULE_NAME}} 控制器
 * 自动生成于 {{TIMESTAMP}}
 */

const { Core } = require('@usethink/node-backend-core');
const {{MODULE_NAME}}Service = require('../services/{{MODULE_NAME}}Service');

class {{MODULE_NAME}}Controller extends Core.BaseController {
  constructor() {
    super();
    this.{{MODULE_NAME_CAMEL}}Service = new {{MODULE_NAME}}Service();
  }

  /**
   * 获取{{MODULE_NAME}}列表
   */
  get{{MODULE_NAME}}List = this.paginatedApiMethod(async (req) => {
    const { page = 1, limit = 20, ...filters } = req.query;
    return await this.{{MODULE_NAME_CAMEL}}Service.getList({ page, limit, filters });
  }, {
    errorMsg: '获取{{MODULE_NAME}}列表失败'
  });

  /**
   * 获取{{MODULE_NAME}}详情
   */
  get{{MODULE_NAME}}Detail = this.entityApiMethod(async (req) => {
    const { id } = req.params;
    if (!id) {
      return this.paramError('缺少{{MODULE_NAME}}ID');
    }
    return await this.{{MODULE_NAME_CAMEL}}Service.getById(id);
  }, {
    errorMsg: '获取{{MODULE_NAME}}详情失败'
  });

  /**
   * 创建{{MODULE_NAME}}
   */
  create{{MODULE_NAME}} = this.operationApiMethod(async (req) => {
    {{INCLUDE_VALIDATION}}
    return await this.{{MODULE_NAME_CAMEL}}Service.create(req.body);
  }, {
    errorMsg: '创建{{MODULE_NAME}}失败'
  });

  /**
   * 更新{{MODULE_NAME}}
   */
  update{{MODULE_NAME}} = this.operationApiMethod(async (req) => {
    const { id } = req.params;
    if (!id) {
      return this.paramError('缺少{{MODULE_NAME}}ID');
    }
    {{INCLUDE_VALIDATION}}
    return await this.{{MODULE_NAME_CAMEL}}Service.update(id, req.body);
  }, {
    errorMsg: '更新{{MODULE_NAME}}失败'
  });

  /**
   * 删除{{MODULE_NAME}}
   */
  delete{{MODULE_NAME}} = this.operationApiMethod(async (req) => {
    const { id } = req.params;
    if (!id) {
      return this.paramError('缺少{{MODULE_NAME}}ID');
    }
    return await this.{{MODULE_NAME_CAMEL}}Service.delete(id);
  }, {
    errorMsg: '删除{{MODULE_NAME}}失败'
  });

  /**
   * 批量删除{{MODULE_NAME}}
   */
  batchDelete{{MODULE_NAME}} = this.operationApiMethod(async (req) => {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return this.paramError('缺少要删除的ID列表');
    }
    return await this.{{MODULE_NAME_CAMEL}}Service.batchDelete(ids);
  }, {
    errorMsg: '批量删除{{MODULE_NAME}}失败'
  });
}

module.exports = {{MODULE_NAME}}Controller;`;
  }

  /**
   * 服务模板
   * @private
   */
  _getServiceTemplate() {
    return `/**
 * {{MODULE_NAME}} 服务
 * 自动生成于 {{TIMESTAMP}}
 */

const { Core } = require('@usethink/node-backend-core');

class {{MODULE_NAME}}Service extends Core.BaseService {
  constructor() {
    super();
    this.model = this.getModel('{{MODULE_NAME}}');
  }

  /**
   * 获取{{MODULE_NAME}}列表
   */
  async getList({ page = 1, limit = 20, filters = {} }) {
    const result = await this.model.findByPage({
      page,
      limit,
      where: this._buildWhereCondition(filters),
      order: [['created_at', 'DESC']]
    });

    return this.success(result, '获取{{MODULE_NAME}}列表成功');
  }

  /**
   * 根据ID获取{{MODULE_NAME}}
   */
  async getById(id) {
    const item = await this.model.findByPk(id);
    if (!item) {
      throw new Error('{{MODULE_NAME}}不存在');
    }
    return this.success(item, '获取{{MODULE_NAME}}详情成功');
  }

  /**
   * 创建{{MODULE_NAME}}
   */
  async create(data) {
    {{INCLUDE_TRANSACTION}}
    const item = await this.model.create(data);
    return this.success(item, '创建{{MODULE_NAME}}成功');
  }

  /**
   * 更新{{MODULE_NAME}}
   */
  async update(id, data) {
    {{INCLUDE_TRANSACTION}}
    const [affectedRows] = await this.model.update(data, {
      where: { id }
    });

    if (affectedRows === 0) {
      throw new Error('{{MODULE_NAME}}不存在或未发生变更');
    }

    return this.success(null, '更新{{MODULE_NAME}}成功');
  }

  /**
   * 删除{{MODULE_NAME}}
   */
  async delete(id) {
    const affectedRows = await this.model.destroy({
      where: { id }
    });

    if (affectedRows === 0) {
      throw new Error('{{MODULE_NAME}}不存在');
    }

    return this.success(null, '删除{{MODULE_NAME}}成功');
  }

  /**
   * 批量删除{{MODULE_NAME}}
   */
  async batchDelete(ids) {
    {{INCLUDE_TRANSACTION}}
    const affectedRows = await this.model.destroy({
      where: { id: ids }
    });

    return this.success({ affected: affectedRows }, \`批量删除{{MODULE_NAME}}成功，共删除\${affectedRows}条记录\`);
  }

  /**
   * 构建查询条件
   * @private
   */
  _buildWhereCondition(filters) {
    const where = {};

    // 根据实际需求添加过滤条件
    if (filters.status !== undefined) {
      where.status = filters.status;
    }

    if (filters.search) {
      // 示例：按名称搜索
      where.name = { [this.Op.like]: \`%\${filters.search}%\` };
    }

    return where;
  }

  {{INCLUDE_CACHE}}
}

module.exports = {{MODULE_NAME}}Service;`;
  }

  /**
   * 模型模板
   * @private
   */
  _getModelTemplate() {
    return `/**
 * {{MODULE_NAME}} 模型
 * 自动生成于 {{TIMESTAMP}}
 */

const { Core } = require('@usethink/node-backend-core');

class {{MODULE_NAME}} extends Core.BaseModel {
  static init(sequelize, DataTypes) {
    return super.init({
{{FIELDS_CODE}}
    }, {
      sequelize,
      modelName: '{{MODULE_NAME}}',
      tableName: '{{TABLE_NAME}}',
      timestamps: true,
      paranoid: true, // 软删除
      underscored: true, // 使用下划线命名
    });
  }

  static associate(models) {
    // 定义关联关系
    // 示例：
    // this.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
    // this.hasMany(models.Order, { foreignKey: '{{MODULE_NAME_LOWER}}_id', as: 'orders' });
  }
}

module.exports = {{MODULE_NAME}};`;
  }

  /**
   * 路由模板
   * @private
   */
  _getRoutesTemplate() {
    return `/**
 * {{MODULE_NAME}} 路由
 * 自动生成于 {{TIMESTAMP}}
 */

const express = require('express');
const router = express.Router();
const {{MODULE_NAME}}Controller = require('../controllers/{{MODULE_NAME}}Controller');

const controller = new {{MODULE_NAME}}Controller();

// {{MODULE_NAME}} 路由
router.get('/{{MODULE_NAME_PLURAL}}', {{INCLUDE_AUTH}}controller.get{{MODULE_NAME}}List);
router.get('/{{MODULE_NAME_PLURAL}}/:id', {{INCLUDE_AUTH}}controller.get{{MODULE_NAME}}Detail);
router.post('/{{MODULE_NAME_PLURAL}}', {{INCLUDE_AUTH}}controller.create{{MODULE_NAME}});
router.put('/{{MODULE_NAME_PLURAL}}/:id', {{INCLUDE_AUTH}}controller.update{{MODULE_NAME}});
router.delete('/{{MODULE_NAME_PLURAL}}/:id', {{INCLUDE_AUTH}}controller.delete{{MODULE_NAME}});
router.post('/{{MODULE_NAME_PLURAL}}/batch-delete', {{INCLUDE_AUTH}}controller.batchDelete{{MODULE_NAME}});

module.exports = router;`;
  }

  // ==================== 工具方法 ====================

  _toCamelCase(str) {
    return str.charAt(0).toLowerCase() + str.slice(1);
  }

  _toSnakeCase(str) {
    return str
      .replace(/([A-Z])/g, "_$1")
      .toLowerCase()
      .replace(/^_/, "");
  }

  _toPlural(str) {
    // 简单的复数形式转换
    if (str.endsWith("y")) {
      return str.slice(0, -1) + "ies";
    }
    if (str.endsWith("s") || str.endsWith("x") || str.endsWith("z")) {
      return str + "es";
    }
    return str + "s";
  }

  _getValidationCode() {
    return `    // TODO: 添加数据验证逻辑
    // const validation = this.validateData(req.body, {{MODULE_NAME}}Schema);
    // if (!validation.valid) {
    //   return this.paramError(validation.message);
    // }`;
  }

  _getCacheCode() {
    return `
  /**
   * 获取缓存的{{MODULE_NAME}}
   */
  async getCached{{MODULE_NAME}}(id, ttl = 3600) {
    const cacheKey = \`{{MODULE_NAME_LOWER}}:\${id}\`;
    return await this.findWithCache(cacheKey, () => this.getById(id), ttl);
  }`;
  }

  _getTransactionCode() {
    return `    // 使用事务确保数据一致性
    // const transaction = await this.sequelize.transaction();
    // try {
    //   // 业务逻辑
    //   await transaction.commit();
    // } catch (error) {
    //   await transaction.rollback();
    //   throw error;
    // }`;
  }

  _getAuthMiddleware() {
    return `authMiddleware, `;
  }

  _generateFieldsCode(fields) {
    return fields
      .map((field) => {
        const { name, type, allowNull = true, defaultValue, comment } = field;
        let fieldCode = `      ${name}: {
        type: DataTypes.${type.toUpperCase()}`;

        if (!allowNull) {
          fieldCode += `,
        allowNull: false`;
        }

        if (defaultValue !== undefined) {
          fieldCode += `,
        defaultValue: ${JSON.stringify(defaultValue)}`;
        }

        if (comment) {
          fieldCode += `,
        comment: '${comment}'`;
        }

        fieldCode += `
      }`;

        return fieldCode;
      })
      .join(",\n");
  }

  _getDefaultFieldsCode() {
    return `      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        comment: 'ID'
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: '名称'
      },
      status: {
        type: DataTypes.TINYINT,
        allowNull: false,
        defaultValue: 1,
        comment: '状态：0-禁用，1-启用'
      },
      remark: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: '备注'
      }`;
  }

  _writeFile(filePath, content) {
    // 确保目录存在
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(filePath, content, "utf8");
  }
}

module.exports = CodeGenerator;
