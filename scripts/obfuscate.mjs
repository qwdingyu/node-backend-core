import javascriptObfuscator from "javascript-obfuscator";
import { readdirSync, statSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";

/**
 * 行业最佳实践：混淆仅用于保护闭源/商业逻辑，开源场景不建议启用。
 * 本脚本提供分级混淆能力，默认不启用，由 CI 按需触发。
 */

const LEVELS = {
  light: {
    compact: true,
    identifierNamesGenerator: "mangled",
    renameGlobals: false,
    controlFlowFlattening: false,
    deadCodeInjection: false,
    debugProtection: false,
    disableConsoleOutput: false,
    selfDefending: false,
    stringArray: false,
    transformObjectKeys: false,
    unicodeEscapeSequence: false,
  },
  standard: {
    compact: true,
    controlFlowFlattening: true,
    controlFlowFlatteningThreshold: 0.75,
    deadCodeInjection: true,
    deadCodeInjectionThreshold: 0.4,
    debugProtection: true,
    debugProtectionInterval: 3000,
    disableConsoleOutput: true,
    identifierNamesGenerator: "mangled",
    renameGlobals: true,
    selfDefending: true,
    stringArray: true,
    stringArrayThreshold: 0.75,
    transformObjectKeys: true,
    unicodeEscapeSequence: false,
    sourceMap: true,
    sourceMapMode: "separate",
  },
  aggressive: {
    compact: true,
    controlFlowFlattening: true,
    controlFlowFlatteningThreshold: 0.75,
    deadCodeInjection: true,
    deadCodeInjectionThreshold: 0.4,
    debugProtection: true,
    debugProtectionInterval: 3000,
    disableConsoleOutput: true,
    identifierNamesGenerator: "mangled-shuffled",
    renameGlobals: true,
    selfDefending: true,
    stringArray: "rc4",
    stringArrayThreshold: 0.75,
    stringArrayEncoding: ["rc4"],
    transformObjectKeys: true,
    unicodeEscapeSequence: true,
    sourceMap: true,
    sourceMapMode: "separate",
  },
};

function resolveLevel(level) {
  const selected = LEVELS[level] || LEVELS.standard;
  return selected;
}

function walk(dir) {
  let entries = readdirSync(dir, { withFileTypes: true });
  let files = [];
  for (const entry of entries) {
    let full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(walk(full));
    } else if (entry.isFile() && entry.name.endsWith(".js")) {
      files.push(full);
    }
  }
  return files;
}

function ensureDir(path) {
  mkdirSync(path, { recursive: true });
}

function obfuscateFile(srcPath, distPath, level) {
  const code = readFileSync(srcPath, "utf8");
  const obfuscationResult = javascriptObfuscator.obfuscate(code, level);
  ensureDir(dirname(distPath));
  writeFileSync(distPath, obfuscationResult.getObfuscatedCode());
  const sourceMap = obfuscationResult.getSourceMap();
  if (sourceMap) {
    writeFileSync(`${distPath}.map`, sourceMap);
  }
}

function main() {
  const args = process.argv.slice(2);
  const levelIndex = args.indexOf("--level");
  let level = "standard";
  if (levelIndex !== -1 && args[levelIndex + 1]) {
    level = args[levelIndex + 1];
  }

  const srcDir = join(process.cwd(), "src");
  const distDir = join(process.cwd(), "dist");
  const files = walk(srcDir);

  const options = resolveLevel(level);

  console.log(`🔒 混淆模式: ${level}`);
  console.log(`📁 输入: ${srcDir}`);
  console.log(`📁 输出: ${distDir}`);
  console.log(`📄 文件数: ${files.length}`);

  for (const file of files) {
    const relativePath = relative(srcDir, file);
    const distPath = join(distDir, relativePath);
    obfuscateFile(file, distPath, options);
  }

  // 处理根目录入口文件（index.js）
  const rootIndex = join(process.cwd(), "index.js");
  if (statSync(rootIndex).isFile()) {
    const distIndex = join(distDir, "index.js");
    obfuscateFile(rootIndex, distIndex, options);
    console.log("🔐 根入口 index.js 已混淆 -> dist/index.js");
  }

  console.log("✅ 混淆完成");
}

main();
