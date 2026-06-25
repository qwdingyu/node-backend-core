/**
 * 投资理财业务工具类
 */
class InvestmentUtil {
  /**
   * 计算投资收益
   * @param {number} principal 本金
   * @param {number} rate 收益率（百分比）
   * @param {number} days 天数
   * @returns {number} 收益金额
   */
  static calculateIncome(principal, rate, days = 1) {
    return (principal * rate * days) / 100;
  }

  /**
   * 计算推荐奖励
   * @param {number} amount 投资金额
   * @param {number} level 推荐层级
   * @param {object} rates 各层级奖励比例
   * @returns {number} 奖励金额
   */
  static calculateReferralReward(amount, level, rates) {
    if (!rates[level] || level < 1) return 0;
    return (amount * rates[level]) / 100;
  }

  /**
   * 生成订单号
   * @param {number} userId 用户ID
   * @returns {string} 订单号
   */
  static generateOrderNo(userId) {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0");
    return `${timestamp}${userId}${random}`;
  }

  /**
   * 验证投资金额
   * @param {number} amount 投资金额
   * @param {number} minAmount 最小投资金额
   * @param {number} maxAmount 最大投资金额
   * @returns {boolean} 验证结果
   */
  static validateInvestmentAmount(amount, minAmount, maxAmount) {
    if (amount < minAmount) {
      throw new Error(`投资金额不能少于${minAmount}元`);
    }
    if (amount > maxAmount) {
      throw new Error(`投资金额不能超过${maxAmount}元`);
    }
    return true;
  }

  /**
   * 计算VIP等级
   * @param {number} totalInvestment 累计投资金额
   * @param {array} vipLevels VIP等级配置
   * @returns {object} VIP等级信息
   */
  static calculateVipLevel(totalInvestment, vipLevels) {
    for (let i = vipLevels.length - 1; i >= 0; i--) {
      if (totalInvestment >= vipLevels[i].minAmount) {
        return vipLevels[i];
      }
    }
    return vipLevels[0]; // 默认最低等级
  }

  /**
   * 计算用户推荐路径
   * @param {string} parentPath 上级推荐路径
   * @param {number} userId 当前用户ID
   * @returns {string} 新的推荐路径
   */
  static buildReferralPath(parentPath, userId) {
    if (!parentPath) {
      return userId.toString();
    }
    return `${parentPath},${userId}`;
  }

  /**
   * 计算推荐层级
   * @param {string} path 推荐路径
   * @returns {number} 层级数
   */
  static calculateReferralLevel(path) {
    if (!path) return 0;
    return path.split(",").length;
  }

  /**
   * 格式化金额显示
   * @param {number} amount 金额
   * @param {number} decimals 小数位数
   * @returns {string} 格式化后的金额
   */
  static formatAmount(amount, decimals = 2) {
    return parseFloat(amount).toFixed(decimals);
  }

  /**
   * 比较两个金额是否相等（考虑浮点数精度问题）
   * @param {number} amount1 金额1
   * @param {number} amount2 金额2
   * @param {number} precision 精度（默认0.01，即分）
   * @returns {boolean} 是否相等
   */
  static isAmountEqual(amount1, amount2, precision = 0.01) {
    const num1 = parseFloat(amount1);
    const num2 = parseFloat(amount2);
    return Math.abs(num1 - num2) < precision;
  }

  /**
   * 验证投资金额是否匹配项目要求
   * @param {number} investmentAmount 投资金额
   * @param {number} projectPrice 项目价格
   * @param {number} precision 精度（默认0.01，即分）
   * @returns {boolean} 验证结果
   */
  static validateInvestmentAmountMatch(investmentAmount, projectPrice, precision = 0.01) {
    if (!this.isAmountEqual(investmentAmount, projectPrice, precision)) {
      throw new Error(
        `投资金额必须为项目规定的投资金额 ${this.formatAmount(projectPrice)} 元，提供的投资额为 ${this.formatAmount(investmentAmount)} 元`
      );
    }
    return true;
  }

  /**
   * 计算复利收益
   * @param {number} principal 本金
   * @param {number} rate 年化收益率（百分比）
   * @param {number} periods 复利周期数
   * @returns {number} 复利收益
   */
  static calculateCompoundInterest(principal, rate, periods) {
    const rateDecimal = rate / 100;
    return principal * Math.pow(1 + rateDecimal, periods) - principal;
  }

  /**
   * 验证用户余额是否足够
   * @param {number} userBalance 用户余额
   * @param {number} requiredAmount 需要的金额
   * @returns {boolean} 验证结果
   */
  static validateBalance(userBalance, requiredAmount) {
    if (userBalance < requiredAmount) {
      throw new Error(`余额不足，当前余额：${this.formatAmount(userBalance)}元，需要：${this.formatAmount(requiredAmount)}元`);
    }
    return true;
  }

  /**
   * 计算手续费
   * @param {number} amount 金额
   * @param {number} feeRate 手续费率（百分比）
   * @param {number} minFee 最小手续费
   * @param {number} maxFee 最大手续费
   * @returns {number} 手续费金额
   */
  static calculateFee(amount, feeRate, minFee = 0, maxFee = Infinity) {
    let fee = (amount * feeRate) / 100;
    fee = Math.max(fee, minFee);
    fee = Math.min(fee, maxFee);
    return parseFloat(fee.toFixed(2));
  }

  /**
   * 生成财务记录备注
   * @param {string} type 操作类型
   * @param {object} details 详细信息
   * @returns {string} 备注内容
   */
  static generateFinanceRemark(type, details) {
    switch (type) {
      case "investment":
        return `投资项目：${details.projectTitle}，金额：${this.formatAmount(details.amount)}元`;
      case "dividend":
        return `项目分红：${details.projectTitle}，收益：${this.formatAmount(details.income)}元`;
      case "referral":
        return `推荐奖励：${details.level}级推荐，奖励：${this.formatAmount(details.reward)}元`;
      case "recharge":
        return `账户充值：${details.payMethod}，金额：${this.formatAmount(details.amount)}元`;
      case "withdraw":
        return `账户提现：金额：${this.formatAmount(details.amount)}元，手续费：${this.formatAmount(details.fee)}元`;
      default:
        return `${type}操作`;
    }
  }

  /**
   * 验证投资项目状态
   * @param {object} project 项目信息
   * @returns {boolean} 验证结果
   */
  static validateProjectStatus(project) {
    if (!project) {
      throw new Error("项目不存在");
    }
    if (project.status !== 1) {
      throw new Error("项目已下架或暂停");
    }
    return true;
  }

  /**
   * 计算项目剩余投资额度
   * @param {object} project 项目信息
   * @param {number} currentInvestment 当前已投资金额
   * @returns {number} 剩余额度
   */
  static calculateRemainingQuota(project, currentInvestment) {
    if (!project.max_amount) {
      return Infinity; // 无限制
    }
    return Math.max(0, project.max_amount - currentInvestment);
  }

  /**
   * 生成投资统计报告
   * @param {array} investments 投资记录
   * @returns {object} 统计报告
   */
  static generateInvestmentReport(investments) {
    const report = {
      totalInvestment: 0,
      totalIncome: 0,
      totalProjects: 0,
      avgReturn: 0,
      projectStats: {},
    };

    investments.forEach((investment) => {
      report.totalInvestment += parseFloat(investment.amount || 0);
      report.totalIncome += parseFloat(investment.total_income || 0);

      const projectId = investment.item_id;
      if (!report.projectStats[projectId]) {
        report.projectStats[projectId] = {
          count: 0,
          amount: 0,
          income: 0,
        };
      }

      report.projectStats[projectId].count++;
      report.projectStats[projectId].amount += parseFloat(investment.amount || 0);
      report.projectStats[projectId].income += parseFloat(investment.total_income || 0);
    });

    report.totalProjects = Object.keys(report.projectStats).length;
    report.avgReturn = report.totalInvestment > 0 ? ((report.totalIncome / report.totalInvestment) * 100).toFixed(2) : 0;

    return report;
  }
}

module.exports = InvestmentUtil;
