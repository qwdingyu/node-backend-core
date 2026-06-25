import { readFileSync, writeFileSync, cpSync, rmSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const cwd = process.cwd();
const tempDir = join(cwd, ".publish-temp");

// 清理旧产物，确保可重复构建
if (existsSync(tempDir)) {
  rmSync(tempDir, { recursive: true });
}
mkdirSync(tempDir, { recursive: true });

// 读取原始 manifest
const pkg = JSON.parse(readFileSync(join(cwd, "package.json"), "utf8"));

// 构建发布专用 manifest：仅包含必要字段，入口指向 dist/
const publishPkg = {
  name: pkg.name,
  version: pkg.version,
  description: pkg.description,
  main: "dist/index.js",
  bin: pkg.bin,
  files: ["dist/", "bin/", "README.md"],
  publishConfig: pkg.publishConfig,
  dependencies: pkg.dependencies,
  peerDependencies: pkg.peerDependencies,
  engines: pkg.engines,
  keywords: pkg.keywords,
  author: pkg.author,
  license: pkg.license,
  homepage: pkg.homepage,
  repository: pkg.repository,
};

// 复制必要文件到临时发布目录
const copyEntry = (entry) => {
  const src = join(cwd, entry);
  const dest = join(tempDir, entry);
  if (existsSync(src)) {
    cpSync(src, dest, { recursive: true });
  }
};

copyEntry("README.md");
if (existsSync(join(cwd, "bin"))) {
  copyEntry("bin");
}
if (existsSync(join(cwd, "dist"))) {
  copyEntry("dist");
}

writeFileSync(join(tempDir, "package.json"), `${JSON.stringify(publishPkg, null, 2)}\n`);
console.log(`📦 发布临时目录已准备: ${tempDir}`);
