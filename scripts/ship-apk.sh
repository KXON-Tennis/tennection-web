#!/usr/bin/env bash
# Ship a new test APK to the live site (tennection.kxon.net/install).
#
#   pnpm ship-apk                  # deploy the APK already at ./tennisnut.apk
#   pnpm ship-apk <path-to.apk>    # copy that file in as tennisnut.apk, then deploy
#
# The APK is intentionally NOT in git (it's 80+MB). It lives here locally and
# Vercel uploads it on deploy. To update the test build: drop the new file in
# and run this — the URL (/tennisnut.apk) never changes.
set -euo pipefail
cd "$(dirname "$0")/.."

APK="tennisnut.apk"
SRC="${1:-}"

if [ -n "$SRC" ]; then
  if [ ! -f "$SRC" ]; then
    echo "❌ 找不到檔案: $SRC" >&2
    exit 1
  fi
  cp "$SRC" "$APK"
  echo "📦 已複製 $SRC → $APK"
fi

if [ ! -f "$APK" ]; then
  echo "❌ $APK 不存在。用法: pnpm ship-apk <新的-apk-路徑>" >&2
  exit 1
fi

# Sanity: a real APK is a zip, so it starts with the bytes "PK".
if [ "$(head -c 2 "$APK")" != "PK" ]; then
  echo "❌ $APK 看起來不是有效的 APK/zip 檔" >&2
  exit 1
fi

SIZE="$(du -h "$APK" | awk '{print $1}')"
echo "🚀 部署中… (APK $SIZE)"
npx vercel deploy --prod --yes

echo "🔎 驗證線上 APK…"
RESULT="$(curl -s -o /dev/null -w "%{http_code} %{content_type}" https://tennection.kxon.net/tennisnut.apk)"
echo "   /tennisnut.apk → $RESULT"
case "$RESULT" in
  200*) echo "✅ 完成：https://tennection.kxon.net/install" ;;
  *)    echo "⚠️  線上回應不是 200，請檢查。" >&2; exit 1 ;;
esac
