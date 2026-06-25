const fs = require("fs");
const path = require("path");
const multer = require("multer");

class FileUtil {
  /**
   * 配置文件上传中间件
   * @param {string} destination - 上传目录
   * @param {Array<string>} allowedTypes - 允许的文件类型
   * @param {number} maxSize - 最大文件大小（字节）
   * @returns {Object} - multer中间件
   */
  static uploadMiddleware(
    destination = "uploads",
    allowedTypes = [],
    maxSize = 5 * 1024 * 1024
  ) {
    // 确保上传目录存在
    const uploadDir = path.join(process.cwd(), "public", destination);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // 配置存储
    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, uploadDir);
      },
      filename: (req, file, cb) => {
        // 生成唯一文件名
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + "-" + uniqueSuffix + ext);
      },
    });

    // 文件过滤器
    const fileFilter = (req, file, cb) => {
      if (allowedTypes.length === 0) {
        return cb(null, true);
      }

      const ext = path.extname(file.originalname).toLowerCase();
      if (allowedTypes.includes(ext)) {
        return cb(null, true);
      }

      cb(new Error("不支持的文件类型"));
    };

    return multer({
      storage,
      fileFilter,
      limits: { fileSize: maxSize },
    });
  }

  /**
   * 保存Base64图片
   * @param {string} base64String - Base64字符串
   * @param {string} destination - 保存目录
   * @param {string} filename - 文件名（不含扩展名）
   * @returns {string} - 保存后的文件路径
   */
  static saveBase64Image(base64String, destination = "uploads", filename = "") {
    // 从Base64字符串中提取数据和类型
    const matches = base64String.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      throw new Error("无效的Base64字符串");
    }

    // 获取MIME类型和数据
    const type = matches[1];
    const data = Buffer.from(matches[2], "base64");

    // 确定文件扩展名
    let ext = ".png";
    if (type === "image/jpeg") ext = ".jpg";
    else if (type === "image/gif") ext = ".gif";

    // 确保目录存在
    const uploadDir = path.join(process.cwd(), "public", destination);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // 生成文件名
    const finalFilename = filename || `image-${Date.now()}${ext}`;
    const filePath = path.join(uploadDir, finalFilename);

    // 写入文件
    fs.writeFileSync(filePath, data);

    // 返回相对路径
    return path.join(destination, finalFilename);
  }

  /**
   * 删除文件
   * @param {string} filePath - 文件路径
   * @returns {boolean} - 是否删除成功
   */
  static deleteFile(filePath) {
    try {
      const fullPath = path.join(process.cwd(), "public", filePath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        return true;
      }
      return false;
    } catch (error) {
      console.error("删除文件错误:", error);
      return false;
    }
  }
}

module.exports = FileUtil;
