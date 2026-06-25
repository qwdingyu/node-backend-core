class DateUtil {
  /**
   * 获取当前时间戳（秒）
   * @returns {number} - 当前时间戳
   */
  static timestamp() {
    return Math.floor(Date.now() / 1000);
  }

  /**
   * 格式化日期时间
   * @param {Date|number|string} date - 日期对象、时间戳或日期字符串
   * @param {string} format - 格式化模板，默认为'YYYY-MM-DD HH:mm:ss'
   * @returns {string} - 格式化后的日期字符串
   */
  static format(date = new Date(), format = "YYYY-MM-DD HH:mm:ss") {
    const d = date instanceof Date ? date : new Date(date);

    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const hours = d.getHours();
    const minutes = d.getMinutes();
    const seconds = d.getSeconds();

    const pad = (num) => (num < 10 ? "0" + num : num);

    return format
      .replace("YYYY", year)
      .replace("MM", pad(month))
      .replace("DD", pad(day))
      .replace("HH", pad(hours))
      .replace("mm", pad(minutes))
      .replace("ss", pad(seconds));
  }

  /**
   * 获取今天的开始时间戳（秒）
   * @returns {number} - 今天开始的时间戳
   */
  static todayStart() {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return Math.floor(now.getTime() / 1000);
  }

  /**
   * 获取今天的结束时间戳（秒）
   * @returns {number} - 今天结束的时间戳
   */
  static todayEnd() {
    const now = new Date();
    now.setHours(23, 59, 59, 999);
    return Math.floor(now.getTime() / 1000);
  }

  /**
   * 获取明天的开始时间戳（秒）
   * @returns {number} - 明天开始的时间戳
   */
  static tomorrowStart() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return Math.floor(tomorrow.getTime() / 1000);
  }

  /**
   * 计算距离明天凌晨的毫秒数
   * @returns {number} - 距离明天凌晨的毫秒数
   */
  static millisecondsUntilMidnight() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    return tomorrow.getTime() - now.getTime();
  }
}

module.exports = DateUtil;
