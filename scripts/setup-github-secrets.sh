#!/usr/bin/env bash
#
# 一键配置 GitHub Secrets（用于 npm 发布）
#
# 用法：
#   NPM_TOKEN="npm_你的token" bash scripts/setup-github-secrets.sh
#
# 前置条件：
#   - 已安装 GitHub CLI (gh) 并登录
#   - 当前目录为项目根目录
#

set -euo pipefail

if [ -z "${NPM_TOKEN:-}" ]; then
  echo "❌ 错误：请通过环境变量提供 NPM_TOKEN"
  echo "   示例：NPM_TOKEN='npm_xxx' bash $0"
  exit 1
fi

if ! command -v gh >/dev/null 2>&1; then
  echo "❌ 错误：未找到 gh 命令，请先安装 GitHub CLI"
  exit 1
fi

REPO_NAME=$(basename "$(git remote get-url origin .)" .git)

echo "🔧 配置仓库 $REPO_NAME 的 NPM_TOKEN..."

gh secret set NPM_TOKEN --body "$NPM_TOKEN" --repo "$REPO_NAME"

echo "✅ NPM_TOKEN 已更新！"
