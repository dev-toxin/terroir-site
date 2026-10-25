#!/usr/bin/env bash
# Build + self-check. Usage: bash scripts/check.sh   (or: npm run check)
# Lighthouse is NOT run here (not installed on purpose) — see docs/sessions/2026-10-02.md.
set -euo pipefail
cd "$(dirname "$0")/.."

if [ -s "$HOME/.nvm/nvm.sh" ]; then
  # shellcheck disable=SC1091
  . "$HOME/.nvm/nvm.sh" >/dev/null && nvm use >/dev/null 2>&1 || true
fi
node -e 'const [maj]=process.versions.node.split(".");if(+maj<22){console.error("Node 22+ required (nvm use 22)");process.exit(1)}'

echo "▸ build"
log=$(mktemp)
npx astro build 2>&1 | tee "$log" | grep -E "page\(s\) built|Complete" || true
if grep -qiE "\[(warn|error)\]|warning" "$log"; then
  echo "✗ build produced warnings/errors:"; grep -iE "\[(warn|error)\]|warning" "$log"; exit 1
fi

echo "▸ contrast (WCAG AA)"
node scripts/contrast.mjs

echo "▸ static checks"
node scripts/check.mjs

if command -v htmltest >/dev/null 2>&1; then
  echo "▸ htmltest"; htmltest -s dist
fi

echo "▸ sizes"
du -sh dist
du -k dist/index.html dist/ru/index.html dist/_astro/*.css dist/_astro/*.js | sort -n
