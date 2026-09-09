#!/bin/bash
# =========================================================
# 推送 V1 第一終極版到 GitHub（Vercel 會自動部署）
#
# 用法：
#   ./scripts/push-release.sh ghp_xxxxxxxxxxxxxxxxxxxx
#
# 或者先把 token 放進環境變數：
#   export GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
#   ./scripts/push-release.sh
#
# ⚠️ 只推 main 分支，不會動到 v2-dev
# =========================================================

set -e

REPO="geamedia1976-jpg/hautertang-website"
TOKEN="${1:-$GITHUB_TOKEN}"

if [ -z "$TOKEN" ]; then
  echo "❌ 缺少 GitHub token"
  echo ""
  echo "用法：$0 <ghp_開頭的 token>"
  echo ""
  echo "還沒有 token？到這裡產生："
  echo "  https://github.com/settings/tokens"
  echo "  → Generate new token (classic) → 勾選 repo → Generate token"
  exit 1
fi

cd "$(dirname "$0")/.."

BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$BRANCH" != "main" ]; then
  echo "❌ 目前分支是 $BRANCH，不是 main"
  echo "   請先：git checkout main"
  exit 1
fi

echo "準備推送："
git log origin/main..main --oneline
echo ""

# 推送前最後檢查：index.html 不能被注入 data-page-node-id
POLLUTED=$(grep -c "data-page-node-id" index.html || true)
if [ "$POLLUTED" != "0" ]; then
  echo "❌ index.html 有 $POLLUTED 處 data-page-node-id 污染，清理後再推"
  exit 1
fi
echo "✅ index.html 乾淨（0 處污染）"
echo ""

echo "開始推送..."
ALLOW_PUSH=1 git \
  -c http.proxy=http://127.0.0.1:7897 \
  -c https.proxy=http://127.0.0.1:7897 \
  push "https://x-access-token:${TOKEN}@github.com/${REPO}.git" main

echo ""
echo "✅ 推送完成"
echo ""
echo "Vercel 會自動部署，約 1-2 分鐘後可到這裡看進度："
echo "  https://vercel.com/dashboard"
echo ""
echo "接下來記得："
echo "  1. Cloudflare 加 2 筆 CNAME（www 與 @ → cname.vercel-dns.com，灰色雲）"
echo "  2. Vercel → Settings → Domains 加入 www.hauterglobal.com"
echo ""
echo "詳細步驟見：上線檢查清單_www.hauterglobal.com.md"
