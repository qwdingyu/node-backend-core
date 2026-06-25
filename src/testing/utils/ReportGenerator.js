/**
 * 测试报告生成器
 * 生成各种格式的测试报告
 */

const fs = require('fs').promises;
const path = require('path');

class ReportGenerator {
  constructor(options = {}) {
    this.options = {
      outputDir: options.outputDir || './test-reports',
      formats: options.formats || ['console', 'json'],
      includeDetails: options.includeDetails !== false,
      ...options
    };
  }

  /**
   * 生成所有格式的报告
   */
  async generateReports(testResults) {
    // 确保输出目录存在
    await this.ensureOutputDir();

    const reports = {};

    for (const format of this.options.formats) {
      try {
        switch (format) {
          case 'console':
            reports.console = this.generateConsoleReport(testResults);
            break;
          case 'json':
            reports.json = await this.generateJSONReport(testResults);
            break;
          case 'html':
            reports.html = await this.generateHTMLReport(testResults);
            break;
          default:
            console.warn(`⚠️  不支持的报告格式: ${format}`);
        }
      } catch (error) {
        console.error(`❌ 生成${format}报告失败:`, error.message);
      }
    }

    return reports;
  }

  /**
   * 生成控制台报告
   */
  generateConsoleReport(testResults) {
    // 控制台报告已经在TestRunner中实现
    return '控制台报告已输出';
  }

  /**
   * 生成JSON报告
   */
  async generateJSONReport(testResults) {
    const reportData = {
      timestamp: new Date().toISOString(),
      summary: testResults.summary,
      results: testResults.results,
      categories: testResults.categories,
      metadata: {
        generator: '@usethink/node-backend-core Testing Framework',
        version: '1.0.0'
      }
    };

    const jsonContent = JSON.stringify(reportData, null, 2);
    const filePath = path.join(this.options.outputDir, `test-report-${Date.now()}.json`);
    
    await fs.writeFile(filePath, jsonContent);
    console.log(`📄 JSON报告已生成: ${filePath}`);
    
    return filePath;
  }

  /**
   * 生成HTML报告
   */
  async generateHTMLReport(testResults) {
    const htmlContent = this.generateHTMLContent(testResults);
    const filePath = path.join(this.options.outputDir, `test-report-${Date.now()}.html`);
    
    await fs.writeFile(filePath, htmlContent);
    console.log(`📄 HTML报告已生成: ${filePath}`);
    
    return filePath;
  }

  /**
   * 生成HTML内容
   */
  generateHTMLContent(testResults) {
    const { summary, results, categories } = testResults;
    
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>测试报告 - ${new Date().toLocaleString()}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .summary-card { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; }
        .summary-card h3 { margin: 0 0 10px 0; color: #333; }
        .summary-card .value { font-size: 2em; font-weight: bold; }
        .success { color: #28a745; }
        .danger { color: #dc3545; }
        .info { color: #17a2b8; }
        .category { margin-bottom: 30px; }
        .category h2 { color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
        .test-item { padding: 10px; margin: 5px 0; border-radius: 5px; }
        .test-pass { background-color: #d4edda; border-left: 4px solid #28a745; }
        .test-fail { background-color: #f8d7da; border-left: 4px solid #dc3545; }
        .error-details { margin-top: 10px; padding: 10px; background: #f1f1f1; border-radius: 4px; font-family: monospace; font-size: 0.9em; }
        .progress-bar { width: 100%; height: 20px; background: #e9ecef; border-radius: 10px; overflow: hidden; }
        .progress-fill { height: 100%; background: linear-gradient(90deg, #28a745, #20c997); transition: width 0.3s ease; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧪 测试报告</h1>
            <p>生成时间: ${new Date().toLocaleString()}</p>
        </div>
        
        <div class="summary">
            <div class="summary-card">
                <h3>总测试数</h3>
                <div class="value info">${summary.total}</div>
            </div>
            <div class="summary-card">
                <h3>通过</h3>
                <div class="value success">${summary.passed}</div>
            </div>
            <div class="summary-card">
                <h3>失败</h3>
                <div class="value danger">${summary.failed}</div>
            </div>
            <div class="summary-card">
                <h3>成功率</h3>
                <div class="value ${summary.successRate >= 80 ? 'success' : summary.successRate >= 60 ? 'info' : 'danger'}">${summary.successRate}%</div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${summary.successRate}%"></div>
                </div>
            </div>
        </div>
        
        ${Object.entries(categories).map(([categoryName, categoryResults]) => {
          if (categoryResults.length === 0) return '';
          
          const categoryPassed = categoryResults.filter(r => r.success).length;
          const categoryTotal = categoryResults.length;
          
          return `
            <div class="category">
                <h2>📂 ${categoryName.toUpperCase()} (${categoryPassed}/${categoryTotal})</h2>
                ${categoryResults.map(result => `
                    <div class="test-item ${result.success ? 'test-pass' : 'test-fail'}">
                        <strong>${result.success ? '✅' : '❌'} ${result.name}</strong>
                        ${result.duration ? `<span style="float: right; color: #666;">${result.duration}ms</span>` : ''}
                        ${!result.success && result.error ? `
                            <div class="error-details">
                                <strong>错误信息:</strong><br>
                                ${result.error.replace(/\n/g, '<br>')}
                            </div>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
          `;
        }).join('')}
        
        <div style="margin-top: 40px; text-align: center; color: #666; font-size: 0.9em;">
            <p>报告由 @usethink/node-backend-core Testing Framework 生成</p>
            <p>总耗时: ${Math.round(summary.duration / 1000)}秒</p>
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * 确保输出目录存在
   */
  async ensureOutputDir() {
    try {
      await fs.access(this.options.outputDir);
    } catch (error) {
      await fs.mkdir(this.options.outputDir, { recursive: true });
    }
  }
}

module.exports = ReportGenerator;
