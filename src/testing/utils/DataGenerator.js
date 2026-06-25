/**
 * 测试数据生成器
 * 提供各种测试数据生成功能
 */

class DataGenerator {
  constructor(config = {}) {
    this.config = config;
  }

  /**
   * 生成随机字符串
   */
  randomString(length = 10, charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789') {
    let result = '';
    for (let i = 0; i < length; i++) {
      result += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return result;
  }

  /**
   * 生成随机数字
   */
  randomNumber(min = 0, max = 100) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * 生成随机邮箱
   */
  randomEmail(domain = 'example.com') {
    const username = this.randomString(8).toLowerCase();
    return `${username}@${domain}`;
  }

  /**
   * 生成随机手机号
   */
  randomPhone() {
    const prefix = '139';
    const suffix = this.randomString(8, '0123456789');
    return prefix + suffix;
  }

  /**
   * 生成测试用户数据
   */
  generateUser(overrides = {}) {
    const timestamp = Date.now();
    return {
      username: `test_user_${timestamp}`,
      password: 'test123456',
      email: this.randomEmail(),
      phone: this.randomPhone(),
      user_type: 1,
      balance: this.randomNumber(1000, 10000),
      created_at: new Date(),
      updated_at: new Date(),
      ...overrides
    };
  }

  /**
   * 生成测试项目数据
   */
  generateProject(overrides = {}) {
    const timestamp = Date.now();
    return {
      title: `测试项目_${timestamp}`,
      cate_id: 1,
      price: this.randomNumber(1000, 50000),
      start_time: new Date().toISOString().split('T')[0],
      percent: (5 + Math.random() * 10).toFixed(1),
      auto: '30',
      num: 0,
      profit: this.randomNumber(50, 200),
      days: this.randomNumber(30, 365),
      type: 0,
      vip_id: 0,
      status: 1,
      desc: `测试项目描述_${timestamp}`,
      hashrate: '100TH/s',
      power: '3000W',
      created_at: new Date(),
      updated_at: new Date(),
      ...overrides
    };
  }

  /**
   * 生成测试订单数据
   */
  generateOrder(userId, projectId, overrides = {}) {
    const timestamp = Date.now();
    return {
      user_id: userId,
      project_id: projectId,
      orderno: `ORD${timestamp}${this.randomNumber(100, 999)}`,
      item_id: projectId,
      amount: this.randomNumber(1000, 20000),
      status: Math.random() > 0.2 ? 1 : 0,
      order_type: 'investment',
      created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      updated_at: new Date(),
      ...overrides
    };
  }

  /**
   * 生成测试财务记录数据
   */
  generateFinanceRecord(userId, overrides = {}) {
    const types = [1, 2, 3, 4, 5]; // 1=deposit, 2=withdraw, 3=investment, 4=return, 5=commission
    const typeNames = ["deposit", "withdraw", "investment", "return", "commission"];
    
    const typeIndex = Math.floor(Math.random() * types.length);
    const type = types[typeIndex];
    const typeName = typeNames[typeIndex];
    const amount = this.randomNumber(100, 5000);

    return {
      user_id: userId,
      type: type,
      wallet_type: 0,
      money: amount,
      after_money: this.randomNumber(0, 50000),
      remark: `测试${typeName}记录`,
      created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      ...overrides
    };
  }

  /**
   * 批量生成数据
   */
  generateBatch(generator, count, ...args) {
    const results = [];
    for (let i = 0; i < count; i++) {
      results.push(generator.call(this, ...args));
    }
    return results;
  }
}

module.exports = DataGenerator;
