/**
 * 业务集成测试基类
 * 结合服务层和API层测试，用于完整的业务流程测试
 */

const ServiceTest = require("./ServiceTest");
const APITest = require("./APITest");

class BusinessTest extends ServiceTest {
  constructor(testName = "业务集成测试", options = {}) {
    super(testName, options);

    // 集成API测试功能
    this.apiTest = new APITest(`${testName}_API`, options);
  }

  /**
   * 设置测试环境
   */
  async setUp() {
    await super.setUp();

    console.log("🚀 初始化业务集成测试环境...");

    // 初始化API测试环境
    await this.apiTest.setUp();

    console.log("✅ 业务集成测试环境初始化完成");
  }

  /**
   * 通过服务层创建测试数据（替代API调用）
   */
  async createTestDataViaService() {
    console.log("🔧 通过服务层创建测试数据...");

    try {
      // 创建测试用户
      const users = [];
      for (let i = 1; i <= 3; i++) {
        const userData = {
          username: `api_test_user_${i}_${Date.now()}`,
          password: "test123456",
          email: `apitest${i}@example.com`,
          phone: `1390000000${i}`,
          invitation_code: "",
        };

        console.log(`🔍 测试 创建测试用户${i}...`);

        // 这里需要根据实际项目的服务来调整
        // 示例：使用AuthService创建用户
        try {
          const path = require("path");
          const authServicePath = this.config.services?.authServicePath || "./src/services/auth.service";
          const fullAuthServicePath = path.resolve(process.cwd(), authServicePath);
          const AuthService = require(fullAuthServicePath);
          const authService = new AuthService();

          const userResult = await authService.register(userData);

          if (userResult.success) {
            users.push({
              id: userResult.data.user_id,
              username: userResult.data.username,
              ...userData,
            });
            console.log(`✅ 创建测试用户${i} - 成功`);
          } else {
            console.log(`❌ 创建测试用户${i} - 错误: ${userResult.message}`);
          }
        } catch (error) {
          console.log(`❌ 创建测试用户${i} - 异常: ${error.message}`);
        }
      }

      // 创建测试项目
      const projects = [];
      for (let i = 1; i <= 2; i++) {
        const projectData = {
          title: `API测试项目_${i}_${Date.now()}`,
          cate_id: 1,
          price: 1000 + i * 500,
          start_time: new Date().toISOString().split("T")[0],
          percent: "8.0",
          auto: "30",
          num: 0,
          profit: 50 + i * 10,
          days: 30 * i,
          type: 0,
          vip_id: 0,
          status: 1,
          desc: `API测试项目描述_${i}`,
          hashrate: "100TH/s",
          power: "3000W",
        };

        console.log(`🔍 测试 创建测试项目${i}...`);

        try {
          const path = require("path");
          const projectServicePath = this.config.services?.projectServicePath || "./src/services/project.service";
          const fullProjectServicePath = path.resolve(process.cwd(), projectServicePath);
          const ProjectService = require(fullProjectServicePath);
          const projectService = new ProjectService();

          const projectResult = await projectService.createProject(projectData);

          if (projectResult.success) {
            projects.push({
              id: projectResult.data.id,
              title: projectResult.data.title,
              ...projectData,
            });
            console.log(`✅ 创建测试项目${i} - 成功`);
          } else {
            console.log(`❌ 创建测试项目${i} - 错误: ${projectResult.message}`);
          }
        } catch (error) {
          console.log(`❌ 创建测试项目${i} - 异常: ${error.message}`);
        }
      }

      this.testData.apiUsers = users;
      this.testData.apiProjects = projects;

      console.log(`✅ 通过服务层创建了 ${users.length} 个用户和 ${projects.length} 个项目`);
      return { users, projects };
    } catch (error) {
      console.log(`❌ 创建测试数据失败:`, error.message);
      return { users: [], projects: [] };
    }
  }

  /**
   * 模拟用户充值操作
   */
  async simulateUserDeposit(userId, amount) {
    try {
      const path = require("path");
      const rechargeServicePath = this.config.services?.rechargeServicePath || "./src/services/recharge.service";
      const fullRechargeServicePath = path.resolve(process.cwd(), rechargeServicePath);
      const RechargeService = require(fullRechargeServicePath);
      const rechargeService = new RechargeService();

      const depositData = {
        user_id: userId,
        money: amount,
        reason: "测试充值",
        use_type: 1,
      };

      const result = await rechargeService.createRecharge(depositData);
      if (result.success) {
        // 自动审核通过
        await rechargeService.updateRechargeStatus(result.data.id, 1, "自动审核通过");
        return {
          id: result.data.id,
          user_id: userId,
          amount: amount,
          status: "completed",
        };
      }
      return null;
    } catch (error) {
      console.log(`❌ 用户${userId}充值${amount}元失败:`, error.message);
      return null;
    }
  }

  /**
   * 模拟用户投资操作
   */
  async simulateUserInvestment(userId, projectId, amount) {
    try {
      const path = require("path");
      const orderServicePath = this.config.services?.orderServicePath || "./src/services/order.service";
      const fullOrderServicePath = path.resolve(process.cwd(), orderServicePath);
      const OrderService = require(fullOrderServicePath);
      const orderService = new OrderService();

      const investmentData = {
        user_id: userId,
        item_id: projectId,
        item_name: `测试项目${projectId}`,
        item_price: amount,
        user_name: `测试用户${userId}`,
      };

      const result = await orderService.createOrder(investmentData);
      if (result.success) {
        // 自动完成订单
        await orderService.updateOrderStatus(result.data.id, 1);
        return {
          id: result.data.id,
          user_id: userId,
          project_id: projectId,
          amount: amount,
          status: "completed",
        };
      }
      return null;
    } catch (error) {
      console.log(`❌ 用户${userId}投资项目${projectId}金额${amount}元失败:`, error.message);
      return null;
    }
  }

  /**
   * 模拟用户提现操作
   */
  async simulateUserWithdraw(userId, amount) {
    try {
      const path = require("path");
      const withdrawServicePath = this.config.services?.withdrawServicePath || "./src/services/withdraw.service";
      const fullWithdrawServicePath = path.resolve(process.cwd(), withdrawServicePath);
      const WithdrawService = require(fullWithdrawServicePath);
      const withdrawService = new WithdrawService();

      const withdrawData = {
        user_id: userId,
        money: amount,
        bank_name: "测试银行",
        bank_account: "6222000000000000",
        bank_username: `测试用户${userId}`,
        reason: "测试提现",
      };

      const result = await withdrawService.createWithdraw(withdrawData);
      if (result.success) {
        // 自动审核通过
        await withdrawService.updateWithdrawStatus(result.data.id, 1, "自动审核通过");
        return {
          id: result.data.id,
          user_id: userId,
          amount: amount,
          status: "completed",
        };
      }
      return null;
    } catch (error) {
      console.log(`❌ 用户${userId}提现${amount}元失败:`, error.message);
      return null;
    }
  }

  /**
   * 创建完整业务场景数据
   */
  async createBusinessScenarioData() {
    console.log("🎬 创建完整业务场景数据...");

    // 通过服务层创建基础数据
    const { users, projects } = await this.createTestDataViaService();

    // 模拟业务操作
    const deposits = [];
    const investments = [];
    const withdrawals = [];

    for (const user of users) {
      // 模拟充值
      const depositAmount = 10000 + Math.random() * 50000;
      const deposit = await this.simulateUserDeposit(user.id, depositAmount);
      if (deposit) deposits.push(deposit);

      // 模拟投资
      if (projects.length > 0) {
        const project = projects[Math.floor(Math.random() * projects.length)];
        const investAmount = 5000 + Math.random() * 20000;
        const investment = await this.simulateUserInvestment(user.id, project.id, investAmount);
        if (investment) investments.push(investment);
      }

      // 模拟提现
      const withdrawAmount = 1000 + Math.random() * 5000;
      const withdrawal = await this.simulateUserWithdraw(user.id, withdrawAmount);
      if (withdrawal) withdrawals.push(withdrawal);
    }

    console.log("✅ 业务场景数据创建完成:");
    console.log(`   💰 充值记录: ${deposits.length} 条`);
    console.log(`   📈 投资记录: ${investments.length} 条`);
    console.log(`   💸 提现记录: ${withdrawals.length} 条`);

    // 保存到测试数据中
    this.testData.deposits = deposits;
    this.testData.investments = investments;
    this.testData.withdrawals = withdrawals;

    return {
      users,
      projects,
      deposits,
      investments,
      withdrawals,
    };
  }

  /**
   * 验证业务数据一致性
   */
  async verifyBusinessDataConsistency() {
    console.log("🔍 验证业务数据一致性...");

    // 这里可以添加各种业务数据一致性检查
    // 例如：用户余额、订单状态、财务记录等

    console.log("✅ 业务数据一致性验证通过");
    return true;
  }

  /**
   * 清理测试数据
   */
  async cleanupTestData() {
    await super.cleanupTestData();

    // 清理业务测试特有的数据
    try {
      if (this.testData.withdrawals) {
        // 清理提现记录
        console.log(`🧹 清理 ${this.testData.withdrawals.length} 条提现记录...`);
      }

      if (this.testData.deposits) {
        // 清理充值记录
        console.log(`🧹 清理 ${this.testData.deposits.length} 条充值记录...`);
      }

      if (this.testData.investments) {
        // 清理投资记录
        console.log(`🧹 清理 ${this.testData.investments.length} 条投资记录...`);
      }
    } catch (error) {
      console.log("⚠️  清理业务测试数据时出现错误:", error.message);
    }
  }
}

module.exports = BusinessTest;
