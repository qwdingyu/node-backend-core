/**
 * 财务字段 Mixin
 * 
 * 为模型提供标准的财务字段定义和计算方法
 * 解决 IP 项目中财务字段重复定义的问题
 * 
 * @author Backend Core Team
 * @version 1.0.0
 * @since 2024-07-17
 */

const { DataTypes } = require('sequelize');
const DataTypeHandler = require('../core/DataTypeHandler');
const { FinancialUtils } = require('../utils');

/**
 * 财务字段 Mixin
 * 提供标准的财务字段定义和相关计算方法
 */
const FinancialMixin = {
  /**
   * 获取标准财务字段定义
   * 统一定义常用的财务字段，避免重复代码
   * 
   * @returns {Object} 财务字段定义
   */
  getFinancialFields() {
    return {
      // 余额字段
      balance: {
        type: DataTypes.DECIMAL(22, 2),
        allowNull: false,
        defaultValue: 0.0,
        comment: '账户余额',
        get: DataTypeHandler.createDecimalGetter('balance', 0.0, 2)
      },

      // 总收入
      total_income: {
        type: DataTypes.DECIMAL(22, 2),
        allowNull: false,
        defaultValue: 0.0,
        comment: '累计收入',
        get: DataTypeHandler.createDecimalGetter('total_income', 0.0, 2)
      },

      // 总投资
      total_investment: {
        type: DataTypes.DECIMAL(22, 2),
        allowNull: false,
        defaultValue: 0.0,
        comment: '累计投资',
        get: DataTypeHandler.createDecimalGetter('total_investment', 0.0, 2)
      },

      // 可提现金额
      withdrawable_money: {
        type: DataTypes.DECIMAL(22, 2),
        allowNull: false,
        defaultValue: 0.0,
        comment: '可提现金额',
        get: DataTypeHandler.createDecimalGetter('withdrawable_money', 0.0, 2)
      },

      // 佣金钱包
      kickback_money: {
        type: DataTypes.DECIMAL(22, 2),
        allowNull: false,
        defaultValue: 0.0,
        comment: '佣金钱包',
        get: DataTypeHandler.createDecimalGetter('kickback_money', 0.0, 2)
      },

      // 福利钱包
      benefit_money: {
        type: DataTypes.DECIMAL(22, 2),
        allowNull: false,
        defaultValue: 0.0,
        comment: '福利钱包',
        get: DataTypeHandler.createDecimalGetter('benefit_money', 0.0, 2)
      },

      // 邀请奖励
      invitation_money: {
        type: DataTypes.DECIMAL(22, 2),
        allowNull: false,
        defaultValue: 0.0,
        comment: '邀请奖励',
        get: DataTypeHandler.createDecimalGetter('invitation_money', 0.0, 2)
      }
    };
  },

  /**
   * 获取钱包字段定义
   * 为多钱包系统提供标准字段
   * 
   * @returns {Object} 钱包字段定义
   */
  getWalletFields() {
    return {
      wallet_type: {
        type: DataTypes.TINYINT(1),
        allowNull: false,
        defaultValue: 1,
        comment: '钱包类型(1=佣金，2=福利，3=个人，4=黄金)',
        get: DataTypeHandler.createEnumGetter('wallet_type', [1, 2, 3, 4], 1)
      },

      money: {
        type: DataTypes.DECIMAL(22, 2),
        allowNull: false,
        defaultValue: 0.0,
        comment: '金额',
        get: DataTypeHandler.createDecimalGetter('money', 0.0, 2)
      },

      old_balance: {
        type: DataTypes.DECIMAL(22, 2),
        allowNull: true,
        comment: '变更前余额',
        get: DataTypeHandler.createDecimalGetter('old_balance', 0.0, 2)
      },

      new_balance: {
        type: DataTypes.DECIMAL(22, 2),
        allowNull: true,
        comment: '变更后余额',
        get: DataTypeHandler.createDecimalGetter('new_balance', 0.0, 2)
      }
    };
  },

  /**
   * 获取项目相关财务字段
   * 
   * @returns {Object} 项目财务字段定义
   */
  getProjectFinancialFields() {
    return {
      price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.0,
        comment: '项目价格',
        get: DataTypeHandler.createDecimalGetter('price', 0.0, 2)
      },

      profit: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.0,
        comment: '利润',
        get: DataTypeHandler.createDecimalGetter('profit', 0.0, 2)
      },

      recommend_day_income: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.0,
        comment: '推荐人日收益率%',
        get: DataTypeHandler.createDecimalGetter('recommend_day_income', 0.0, 2)
      }
    };
  },

  /**
   * 计算利润
   * 使用 FinancialUtils 确保精度
   * 
   * @returns {number} 利润金额
   */
  calculateProfit() {
    if (!this.total_income || !this.total_investment) {
      return 0.0;
    }
    return FinancialUtils.subtract(this.total_income, this.total_investment);
  },

  /**
   * 计算利润率
   * 
   * @returns {number} 利润率百分比
   */
  calculateProfitRate() {
    if (!this.total_investment || this.total_investment === 0) {
      return 0.0;
    }
    
    const profit = this.calculateProfit();
    return FinancialUtils.multiply(
      FinancialUtils.divide(profit, this.total_investment),
      100
    );
  },

  /**
   * 获取格式化的余额显示
   * 
   * @param {string} currency - 货币符号
   * @returns {string} 格式化的余额
   */
  getFormattedBalance(currency = '¥') {
    return FinancialUtils.formatCurrency(this.balance || 0, 2, currency);
  },

  /**
   * 获取格式化的总收入显示
   * 
   * @param {string} currency - 货币符号
   * @returns {string} 格式化的总收入
   */
  getFormattedTotalIncome(currency = '¥') {
    return FinancialUtils.formatCurrency(this.total_income || 0, 2, currency);
  },

  /**
   * 获取格式化的总投资显示
   * 
   * @param {string} currency - 货币符号
   * @returns {string} 格式化的总投资
   */
  getFormattedTotalInvestment(currency = '¥') {
    return FinancialUtils.formatCurrency(this.total_investment || 0, 2, currency);
  },

  /**
   * 获取所有钱包余额总和
   * 
   * @returns {number} 总余额
   */
  getTotalWalletBalance() {
    const wallets = [
      this.kickback_money || 0,
      this.benefit_money || 0,
      this.withdrawable_money || 0,
      this.invitation_money || 0
    ];
    
    return wallets.reduce((total, amount) => {
      return FinancialUtils.add(total, amount);
    }, 0);
  },

  /**
   * 检查余额是否充足
   * 
   * @param {number} amount - 需要的金额
   * @param {number} walletType - 钱包类型
   * @returns {boolean} 是否充足
   */
  hasEnoughBalance(amount, walletType = null) {
    if (walletType) {
      const walletBalance = this.getWalletBalance(walletType);
      return FinancialUtils.subtract(walletBalance, amount) >= 0;
    }
    
    const totalBalance = this.getTotalWalletBalance();
    return FinancialUtils.subtract(totalBalance, amount) >= 0;
  },

  /**
   * 获取指定钱包的余额
   * 
   * @param {number} walletType - 钱包类型
   * @returns {number} 钱包余额
   */
  getWalletBalance(walletType) {
    switch (walletType) {
      case 1:
        return this.kickback_money || 0;
      case 2:
        return this.benefit_money || 0;
      case 3:
        return this.withdrawable_money || 0;
      case 4:
        return this.invitation_money || 0;
      default:
        return 0;
    }
  },

  /**
   * 获取钱包类型名称
   * 
   * @param {number} walletType - 钱包类型
   * @returns {string} 钱包名称
   */
  getWalletTypeName(walletType) {
    const walletNames = {
      1: '佣金钱包',
      2: '福利钱包',
      3: '个人钱包',
      4: '黄金钱包'
    };
    
    return walletNames[walletType] || '未知钱包';
  },

  /**
   * 获取财务摘要信息
   * 
   * @returns {Object} 财务摘要
   */
  getFinancialSummary() {
    return {
      totalBalance: this.getTotalWalletBalance(),
      totalIncome: this.total_income || 0,
      totalInvestment: this.total_investment || 0,
      profit: this.calculateProfit(),
      profitRate: this.calculateProfitRate(),
      wallets: {
        kickback: this.kickback_money || 0,
        benefit: this.benefit_money || 0,
        withdrawable: this.withdrawable_money || 0,
        invitation: this.invitation_money || 0
      }
    };
  },

  /**
   * 验证财务数据一致性
   * 
   * @returns {Object} 验证结果
   */
  validateFinancialConsistency() {
    const issues = [];
    
    // 检查负余额
    const walletBalances = [
      { name: 'kickback_money', value: this.kickback_money },
      { name: 'benefit_money', value: this.benefit_money },
      { name: 'withdrawable_money', value: this.withdrawable_money },
      { name: 'invitation_money', value: this.invitation_money }
    ];
    
    walletBalances.forEach(wallet => {
      if (wallet.value < 0) {
        issues.push(`${wallet.name} 存在负余额: ${wallet.value}`);
      }
    });
    
    // 检查异常大额
    const maxReasonableAmount = 10000000; // 1000万
    walletBalances.forEach(wallet => {
      if (wallet.value > maxReasonableAmount) {
        issues.push(`${wallet.name} 金额异常过大: ${wallet.value}`);
      }
    });
    
    return {
      isValid: issues.length === 0,
      issues
    };
  }
};

module.exports = FinancialMixin;
