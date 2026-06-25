/**
 * 运行测试的便捷方法
 */

const TestRunner = require('./TestRunner');

/**
 * 运行测试
 */
async function runTests(options = {}) {
  const runner = new TestRunner(options);
  
  try {
    const report = await runner.runAllTests();
    return report;
  } catch (error) {
    console.error('❌ 测试运行失败:', error);
    throw error;
  }
}

module.exports = runTests;
