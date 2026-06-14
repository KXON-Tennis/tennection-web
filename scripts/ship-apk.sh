#!/usr/bin/env bash
# Ship a new test APK for the live site (tennisnut.kxon.net/install).
#
# ⚠️  PREFER THE CLOUD BUILD. This script uploads the APK from your machine,
#     which fails on slow/unstable uplinks (the GitHub asset upload dies partway
#     and returns HTTP 400). The reliable path is to let GitHub Actions build AND
#     upload the APK — your machine only pushes source. See:
#
#       tns-diary-app repo → Actions → "Build & ship test APK" → Run workflow
#       (or: gh workflow run build-apk.yml --repo kuan-hsun/tns-diary-app)
#
#     That builds arm64-v8a (~29MB), signs it, and uploads to the same Release
#     tag used below. Details: tns-diary-app/README.md → "Releasing a test APK".
#
# This script remains as a manual fallback for when you DO have a fast, stable
# connection and an APK on disk:
#
#   npm run ship-apk                  # upload the APK already at ./tennisnut.apk
#   npm run ship-apk <path-to.apk>    # upload that file as the new test APK
#
# The APK is NOT bundled into the Vercel deploy (it's big and made every
# `npm run ship` upload the whole thing). Instead it lives on a GitHub Release
# under a fixed tag, so the download URL never changes:
#
#   https://github.com/KXON-Tennis/tennection-web/releases/download/apk-latest/tennisnut.apk
#
# install.html links straight to that URL. Updating the test build = re-upload
# to the same tag with --clobber here; the site needs no redeploy.
set -euo pipefail
cd "$(dirname "$0")/.."

TAG="apk-latest"
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
  echo "❌ $APK 不存在。用法: npm run ship-apk <新的-apk-路徑>" >&2
  exit 1
fi

# Sanity: a real APK is a zip, so it starts with the bytes "PK".
if [ "$(head -c 2 "$APK")" != "PK" ]; then
  echo "❌ $APK 看起來不是有效的 APK/zip 檔" >&2
  exit 1
fi

SIZE="$(du -h "$APK" | awk '{print $1}')"
echo "🚀 上傳 APK 到 GitHub Release ($TAG, $SIZE)…"
if gh release view "$TAG" >/dev/null 2>&1; then
  gh release upload "$TAG" "$APK" --clobber
else
  gh release create "$TAG" "$APK" \
    --title "Tennis Nut test APK (latest)" \
    --notes "測試版 APK。下載 URL 固定為 releases/download/$TAG/$APK。"
fi

URL="https://github.com/KXON-Tennis/tennection-web/releases/download/$TAG/$APK"
echo "🔎 驗證下載連結…"
RESULT="$(curl -sIL -o /dev/null -w "%{http_code}" "$URL")"
echo "   $URL → $RESULT"
case "$RESULT" in
  200) echo "✅ 完成。安裝頁：https://tennisnut.kxon.net/install" ;;
  *)   echo "⚠️  下載連結回應不是 200，請檢查。" >&2; exit 1 ;;
esac
