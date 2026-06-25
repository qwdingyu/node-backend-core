/**
 * 测试运行器
 * 负责发现、运行和报告测试结果
 */

const fs = require('fs').promises;
const path = require('path');

class TestRunner {
  constructor(options = {}) {
    this.options = {
      projectRoot: options.projectRoot || process.cwd(),
      testDir: options.testDir || 'tests',
      configFile: options.configFile || null,
      parallel: options.parallel || false,
      maxConcurrent: options.maxConcurrent || 5,
      timeout: options.timeout || 300000, // 5分钟
      ...options
    };
    
    this.testResults = [];
    this.startTime = null;
    this.endTime = null;
  }

  /**
   * 发现测试文件
   */
  async discoverTests() {
    const testDir = path.join(this.options.projectRoot, this.options.testDir);
    const testCategories = {
      services: [],
      business: [],
      api: []
    };

    try {
      // 扫描services测试
      const servicesDir = path.join(testDir, 'services');
      try {
        const serviceFiles = await fs.readdir(servicesDir);
        for (const file of serviceFiles) {
          if (file.endsWith('.test.js')) {
            const testName = file.replace('.test.js', '').replace(/-/g, ' ');
            testCategories.services.push({
              name: `服务测试: ${testName}`,
              file: path.join(servicesDir, file),
              category: 'services'
            });
          }
        }
      } catch (error) {
        // services目录不存在或无法读取
      }

      // 扫描business测试
      const businessDir = path.join(testDir, 'business');
      try {
        const businessFiles = await fs.readdir(businessDir);
        for (const file of businessFiles) {
          if (file.endsWith('.test.js')) {
            const testName = file.replace('.test.js', '').replace(/-/g, ' ');
            testCategories.business.push({
              name: `业务测试: ${testName}`,
              file: path.join(businessDir, file),
              category: 'business'
            });
          }
        }
      } catch (error) {
        // business目录不存在或无法读取
      }

      // 扫描api测试
      const apiDir = path.join(testDir, 'api');
      try {
        const apiFiles = await fs.readdir(apiDir);
        for (const file of apiFiles) {
          if (file.endsWith('.test.js')) {
            const testName = file.replace('.test.js', '').replace(/-/g, ' ');
            testCategories.api.push({
              name: `API测试: ${testName}`,
              file: path.join(apiDir, file),
              category: 'api'
            });
          }
        }
      } catch (error) {
        // api目录不存在或无法读取
      }

    } catch (error) {
      console.error('❌ 发现测试文件失败:', error.message);
    }

    return testCategories;
  }

  /**
   * 运行单个测试
   */
  async runSingleTest(testInfo) {
    console.log(`📋 运行测试: ${testInfo.name}`);
    console.log('='.repeat(60));
    
    const startTime = Date.now();
    
    try {
      // 动态加载测试类
      const TestClass = require(testInfo.file);
      const test = new TestClass();
      
      // 运行测试
      await test.runAllTests();
      
      const duration = Date.now() - startTime;
      console.log(`✅ ${testInfo.name} 测试完成\n`);
      
      return { 
        name: testInfo.name, 
        success: true, 
        duration,
        category: testInfo.category
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      console.log(`❌ ${testInfo.name} 测试失败:`, error.message);
      console.log(`详细错误:`, error);
      console.log('');
      
      return { 
        name: testInfo.name, 
        success: false, 
        error: error.message,
        duration,
        category: testInfo.category
      };
    }
  }

  /**
   * 运行指定类别的测试
   */
  async runTestCategory(categoryName, tests) {
    if (tests.length === 0) {
      console.log(`📂 ${categoryName}: 无测试文件\n`);
      return [];
    }

    console.log(`📂 开始运行 ${categoryName} (${tests.length} 个测试)\n`);
    
    const results = [];
    
    if (this.options.parallel && tests.length > 1) {
      // 并行运行测试
      const chunks = this.chunkArray(tests, this.options.maxConcurrent);
      
      for (const chunk of chunks) {
        const promises = chunk.map(test => this.runSingleTest(test));
        const chunkResults = await Promise.all(promises);
        results.push(...chunkResults);
      }
    } else {
      // 串行运行测试
      for (const test of tests) {
        const result = await this.runSingleTest(test);
        results.push(result);
      }
    }
    
    return results;
  }

  /**
   * 运行所有测试
   */
  async runAllTests() {
    this.startTime = Date.now();
    
    console.log('🧪 开始完整测试套件...\n');
    
    try {
      // 发现测试文件
      const testCategories = await this.discoverTests();
      
      console.log('🎯 发现的测试文件:');
      console.log(`  服务测试: ${testCategories.services.length} 个`);
      console.log(`  业务测试: ${testCategories.business.length} 个`);
      console.log(`  API测试: ${testCategories.api.length} 个`);
      console.log('');

      // 运行所有测试
      const allResults = [];
      
      // 运行服务测试
      const serviceResults = await this.runTestCategory('服务测试', testCategories.services);
      allResults.push(...serviceResults);
      
      // 运行业务测试
      const businessResults = await this.runTestCategory('业务测试', testCategories.business);
      allResults.push(...businessResults);
      
      // 运行API测试
      const apiResults = await this.runTestCategory('API测试', testCategories.api);
      allResults.push(...apiResults);

      this.testResults = allResults;
      this.endTime = Date.now();
      
      // 生成测试报告
      const report = this.generateReport();
      
      return report;
      
    } catch (error) {
      console.error('❌ 测试套件运行失败:', error);
      throw error;
    }
  }

  /**
   * 生成测试报告
   */
  generateReport() {
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.success).length;
    const failedTests = totalTests - passedTests;
    const successRate = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;
    const duration = this.endTime - this.startTime;

    console.log('🎉 完整测试套件执行完成！\n');
    console.log('📊 测试结果总结:');
    console.log('='.repeat(60));
    
    // 按类别分组显示结果
    const categories = {
      services: this.testResults.filter(r => r.category === 'services'),
      business: this.testResults.filter(r => r.category === 'business'),
      api: this.testResults.filter(r => r.category === 'api')
    };

    for (const [categoryName, results] of Object.entries(categories)) {
      if (results.length > 0) {
        const categoryPassed = results.filter(r => r.success).length;
        const categoryTotal = results.length;
        
        console.log(`\n📂 ${categoryName.toUpperCase()} (${categoryPassed}/${categoryTotal}):`);
        
        for (const result of results) {
          const status = result.success ? '✅ 通过' : '❌ 失败';
          console.log(`  ${status} ${result.name}`);
          if (!result.success && result.error) {
            console.log(`    错误: ${result.error}`);
          }
        }
      }
    }

    console.log(`\n📈 总体结果:`);
    console.log(`  总测试数: ${totalTests}`);
    console.log(`  通过: ${passedTests}`);
    console.log(`  失败: ${failedTests}`);
    console.log(`  成功率: ${successRate}%`);
    console.log(`\n⏱️  总耗时: ${Math.round(duration / 1000)}秒`);

    const report = {
      summary: {
        total: totalTests,
        passed: passedTests,
        failed: failedTests,
        successRate,
        duration
      },
      results: this.testResults,
      categories,
      timestamp: new Date().toISOString()
    };

    // 根据测试结果决定退出状态
    if (failedTests > 0) {
      console.log('\n⚠️  部分测试失败，请检查相关问题');
    } else {
      console.log('\n💡 所有测试通过！系统功能正常');
    }

    return report;
  }

  /**
   * 将数组分块
   */
  chunkArray(array, chunkSize) {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }
}

module.exports = TestRunner;
