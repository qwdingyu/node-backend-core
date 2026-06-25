/**
 * 基础测试类
 * 提供所有测试类的通用功能和接口
 */

class BaseTest {
  constructor(testName = "基础测试", options = {}) {
    this.testName = testName;
    this.options = options;
    this.testResults = [];
    this.testData = {}; // 存储测试过程中创建的数据
    this.startTime = null;
    this.endTime = null;

    // 配置管理
    this.config = this.loadConfig(options.configFile);
  }

  /**
   * 加载测试配置
   */
  loadConfig(configFile) {
    if (configFile) {
      try {
        const path = require("path");
        const fullPath = path.resolve(process.cwd(), configFile);
        return require(fullPath);
      } catch (error) {
        console.warn(`⚠️  无法加载配置文件 ${configFile}:`, error.message);
      }
    }

    // 默认配置
    return {
      database: {
        modelsPath: "../../src/models",
        configPath: "../../src/config/database",
      },
      testData: {
        cleanup: true,
        preserve: ["config", "admin"],
      },
      reports: {
        formats: ["console"],
        outputDir: "./test-reports",
      },
    };
  }

  /**
   * 运行单个测试
   */
  async runTest(testName, testMethod) {
    console.log(`🧪 执行测试: ${testName}`);

    const startTime = Date.now();

    try {
      const result = await testMethod();
      const duration = Date.now() - startTime;

      if (result && result.success !== false) {
        console.log(`✅ ${testName}: ${result?.message || "通过"}`);
        this.testResults.push({
          name: testName,
          status: "PASS",
          message: result?.message || "通过",
          duration,
        });
      } else {
        throw new Error(result?.message || "测试失败");
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      console.log(`❌ ${testName}: ${error.message}`);
      this.testResults.push({
        name: testName,
        status: "FAIL",
        message: error.message,
        duration,
        error: error.stack,
      });
    }
  }

  /**
   * 断言方法
   */
  assert(condition, message) {
    if (!condition) {
      throw new Error(message || "断言失败");
    }
  }

  assertEqual(actual, expected, message) {
    if (actual !== expected) {
      throw new Error(message || `期望值: ${expected}, 实际值: ${actual}`);
    }
  }

  assertNotEqual(actual, expected, message) {
    if (actual === expected) {
      throw new Error(message || `期望值不应该等于: ${expected}`);
    }
  }

  assertTrue(condition, message) {
    this.assert(condition === true, message || "期望值应该为true");
  }

  assertFalse(condition, message) {
    this.assert(condition === false, message || "期望值应该为false");
  }

  assertNull(value, message) {
    this.assert(value === null, message || "期望值应该为null");
  }

  assertNotNull(value, message) {
    this.assert(value !== null, message || "期望值不应该为null");
  }

  assertContains(haystack, needle, message) {
    if (typeof haystack === 'string') {
      this.assert(haystack.includes(needle), message || `字符串应该包含: ${needle}`);
    } else if (Array.isArray(haystack)) {
      this.assert(haystack.includes(needle), message || `数组应该包含: ${needle}`);
    } else if (typeof haystack === 'object' && haystack !== null) {
      this.assert(haystack.hasOwnProperty(needle), message || `对象应该包含属性: ${needle}`);
    } else {
      throw new Error(message || `无法检查包含关系，不支持的类型: ${typeof haystack}`);
    }
  }

  assertNotContains(haystack, needle, message) {
    if (typeof haystack === 'string') {
      this.assert(!haystack.includes(needle), message || `字符串不应该包含: ${needle}`);
    } else if (Array.isArray(haystack)) {
      this.assert(!haystack.includes(needle), message || `数组不应该包含: ${needle}`);
    } else if (typeof haystack === 'object' && haystack !== null) {
      this.assert(!haystack.hasOwnProperty(needle), message || `对象不应该包含属性: ${needle}`);
    } else {
      throw new Error(message || `无法检查包含关系，不支持的类型: ${typeof haystack}`);
    }
  }

  assertUndefined(value, message) {
    this.assert(value === undefined, message || "期望值应该为undefined");
  }

  assertNotUndefined(value, message) {
    this.assert(value !== undefined, message || "期望值不应该为undefined");
  }

  /**
   * 设置测试环境
   */
  async setUp() {
    this.startTime = Date.now();
    // 子类可以重写此方法
  }

  /**
   * 清理测试环境
   */
  async tearDown() {
    this.endTime = Date.now();

    if (this.config.testData.cleanup) {
      await this.cleanupTestData();
    }
  }

  /**
   * 清理测试数据
   */
  async cleanupTestData() {
    // 子类可以重写此方法
    console.log("🧹 清理测试数据...");
  }

  /**
   * 打印测试结果摘要
   */
  printSummary() {
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter((r) => r.status === "PASS").length;
    const failedTests = totalTests - passedTests;
    const successRate = totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : 0;
    const totalDuration = this.endTime - this.startTime;

    console.log(`\n📊 ${this.testName} 结果总结:`);
    console.log("=".repeat(50));

    // 显示每个测试的结果
    this.testResults.forEach((result) => {
      const status = result.status === "PASS" ? "✅ 通过" : "❌ 失败";
      console.log(`  ${status} ${result.name}`);
      if (result.status === "FAIL") {
        console.log(`    错误: ${result.message}`);
      }
    });

    console.log(`\n📈 成功率: ${passedTests}/${totalTests} (${successRate}%)`);

    if (totalDuration) {
      console.log(`⏱️  总耗时: ${totalDuration}ms`);
    }

    return {
      total: totalTests,
      passed: passedTests,
      failed: failedTests,
      successRate: parseFloat(successRate),
      duration: totalDuration,
    };
  }

  /**
   * 生成测试报告
   */
  generateReport() {
    const summary = this.printSummary();

    return {
      testName: this.testName,
      summary,
      results: this.testResults,
      testData: this.testData,
      config: this.config,
      timestamp: new Date().toISOString(),
    };
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

  /**
   * 主测试运行方法 - 子类必须实现
   */
  async runAllTests() {
    throw new Error("runAllTests方法必须在子类中实现");
  }
}

module.exports = BaseTest;
