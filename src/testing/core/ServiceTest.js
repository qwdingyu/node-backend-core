/**
 * 服务层测试基类
 * 专门用于测试服务层，包含数据库初始化和Core.BaseService.setDefaults调用
 */

const BaseTest = require("./BaseTest");
const Core = require("../../core");

class ServiceTest extends BaseTest {
  constructor(testName = "服务测试", options = {}) {
    super(testName, options);
    this.sequelize = null;
    this.models = null;
  }

  /**
   * 初始化数据库连接和模型
   */
  async initializeDatabase() {
    try {
      console.log("🔧 初始化数据库连接...");

      // 动态导入数据库配置和模型
      const path = require("path");
      const modelsPath = this.config.database.modelsPath;
      const fullModelsPath = path.resolve(process.cwd(), modelsPath);
      const { sequelize, models } = require(fullModelsPath);

      this.sequelize = sequelize;
      this.models = models;

      // 设置Core.BaseService的默认值
      await Core.BaseService.setDefaults({ sequelize, models });

      console.log("✅ 数据库连接初始化完成");
      return true;
    } catch (error) {
      console.log("❌ 数据库连接初始化失败:", error.message);
      throw error;
    }
  }

  /**
   * 设置测试环境
   */
  async setUp() {
    await super.setUp();
    await this.initializeDatabase();
  }

  /**
   * 创建测试用户
   */
  async createTestUsers(count = 3) {
    console.log(`🔧 创建 ${count} 个测试用户...`);

    const users = [];
    for (let i = 1; i <= count; i++) {
      const userData = {
        username: `test_user_${i}_${Date.now()}`,
        password: "test123456",
        pwd: "test123456", // 加密后的密码
        safe_pwd: "test123456", // 安全密码
        email: `test${i}@example.com`,
        phone: `1390000000${i}`,
        user_type: 1, // 1=normal, 2=vip
        balance: 1000 + Math.random() * 5000,
        invitation_code: "", // 邀请码
        created_at: new Date(),
        updated_at: new Date(),
      };

      const user = await this.models.User.create(userData);
      users.push(user);
    }

    this.testData.users = users;
    console.log(`✅ 创建了 ${users.length} 个测试用户`);
    return users;
  }

  /**
   * 创建测试项目
   */
  async createTestProjects(count = 2) {
    console.log(`🔧 创建 ${count} 个测试项目...`);

    const projects = [];
    for (let i = 1; i <= count; i++) {
      const projectData = {
        project_name: `测试项目_${i}_${Date.now()}`,
        title: `测试项目标题_${i}_${Date.now()}`,
        project_type: "investment",
        min_amount: 1000,
        max_amount: 50000,
        expected_return: 8.5 + i * 0.5,
        duration_days: 30 + i * 30,
        status: 1, // 1=active
        created_at: new Date(),
        updated_at: new Date(),
      };

      const project = await this.models.Project.create(projectData);
      projects.push(project);
    }

    this.testData.projects = projects;
    console.log(`✅ 创建了 ${projects.length} 个测试项目`);
    return projects;
  }

  /**
   * 创建测试订单
   */
  async createTestOrders(users, projects, count = 6) {
    console.log(`🔧 创建测试订单数据...`);

    const orders = [];
    for (let i = 0; i < count; i++) {
      const user = users[Math.floor(Math.random() * users.length)];
      const project = projects[Math.floor(Math.random() * projects.length)];

      const orderData = {
        user_id: user.id,
        project_id: project.id,
        orderno: `ORD${Date.now()}${Math.floor(Math.random() * 1000)}`,
        item_id: project.id,
        amount: 5000 + Math.random() * 10000,
        status: Math.random() > 0.2 ? 1 : 0, // 1=completed, 0=pending
        order_type: "investment",
        created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        updated_at: new Date(),
      };

      const order = await this.models.Order.create(orderData);
      orders.push(order);
    }

    this.testData.orders = orders;
    console.log(`✅ 创建了 ${orders.length} 个测试订单`);
    return orders;
  }

  /**
   * 创建测试财务记录
   */
  async createTestFinanceRecords(users, count = 15) {
    console.log(`🔧 创建 ${count} 条测试财务记录...`);

    const types = [1, 2, 3, 4, 5]; // 1=deposit, 2=withdraw, 3=investment, 4=return, 5=commission
    const typeNames = ["deposit", "withdraw", "investment", "return", "commission"];

    const records = [];
    for (let i = 0; i < count; i++) {
      const user = users[Math.floor(Math.random() * users.length)];
      const typeIndex = Math.floor(Math.random() * types.length);
      const type = types[typeIndex];
      const typeName = typeNames[typeIndex];

      const amount = 100 + Math.random() * 5000;
      const financeData = {
        user_id: user.id,
        username: user.username,
        type: type,
        wallet_type: 0,
        money: amount,
        after_money: user.balance + (typeName === "deposit" ? amount : -amount),
        remark: `测试${typeName}记录`,
        created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      };

      const record = await this.models.Finance.create(financeData);
      records.push(record);
    }

    this.testData.financeRecords = records;
    console.log(`✅ 创建了 ${records.length} 条测试财务记录`);
    return records;
  }

  /**
   * 清理测试数据
   */
  async cleanupTestData() {
    await super.cleanupTestData();

    try {
      // 清理顺序很重要，要先清理有外键依赖的表
      if (this.testData.financeRecords) {
        await this.models.Finance.destroy({
          where: { id: this.testData.financeRecords.map((r) => r.id) },
        });
        console.log(`✅ 已清理 ${this.testData.financeRecords.length} 条财务记录`);
      }

      if (this.testData.orders) {
        await this.models.Order.destroy({
          where: { id: this.testData.orders.map((o) => o.id) },
        });
        console.log(`✅ 已清理 ${this.testData.orders.length} 个订单`);
      }

      if (this.testData.projects) {
        await this.models.Project.destroy({
          where: { id: this.testData.projects.map((p) => p.id) },
        });
        console.log(`✅ 已清理 ${this.testData.projects.length} 个项目`);
      }

      if (this.testData.users) {
        await this.models.User.destroy({
          where: { id: this.testData.users.map((u) => u.id) },
        });
        console.log(`✅ 已清理 ${this.testData.users.length} 个用户`);
      }
    } catch (error) {
      console.log("⚠️  清理测试数据时出现错误:", error.message);
    }
  }

  /**
   * 运行所有测试方法
   */
  async runTests() {
    this.startTime = Date.now();

    try {
      console.log('🔧 开始设置测试环境...');
      // 设置测试环境
      await this.setUp();
      console.log('✅ 测试环境设置完成');

      // 获取所有以 test 开头的方法
      const testMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(this))
        .filter(method => method.startsWith('test') && typeof this[method] === 'function');

      console.log(`🧪 发现 ${testMethods.length} 个测试方法`);

      for (const methodName of testMethods) {
        await this.runTest(methodName, async () => {
          return await this[methodName]();
        });
      }

    } finally {
      // 清理测试环境
      try {
        console.log('🧹 开始清理测试环境...');
        await this.tearDown();
        console.log('✅ 测试环境清理完成');
      } catch (error) {
        console.error('❌ 测试清理失败:', error.message);
      }

      this.endTime = Date.now();
    }
  }

  /**
   * 获取测试结果
   */
  getResults() {
    const passed = this.testResults.filter(r => r.status === 'PASS').length;
    const failed = this.testResults.filter(r => r.status === 'FAIL').length;
    const total = this.testResults.length;
    const duration = this.endTime - this.startTime;
    const failures = this.testResults.filter(r => r.status === 'FAIL').map(r => ({
      test: r.name,
      error: r.message
    }));

    return {
      testName: this.testName,
      total,
      passed,
      failed,
      duration,
      results: this.testResults,
      failures,
      success: failed === 0,
      successRate: total > 0 ? Math.round((passed / total) * 100) : 0
    };
  }
}

module.exports = ServiceTest;
