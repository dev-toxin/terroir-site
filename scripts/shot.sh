#!/usr/bin/env bash
# Local visual check: screenshots via headless Chrome (if installed).
# Usage: scripts/shot.sh /ru/ 360 [height] [out.png]   (needs `npm run preview` on :4321)
# Headless Chrome has a minimum window width (~500px), so narrow widths are rendered
# inside an <iframe> of the exact width. Chrome sometimes doesn't exit → we kill it.
set -uo pipefail
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
path="${1:-/}"; w="${2:-1440}"; h="${3:-2400}"; out="${4:-/tmp/shot-$w.png}"
rm -f "$out"
url="http://localhost:4321$path"
win="$w"
if [ "$w" -lt 600 ]; then
  frame="/tmp/terroir-frame-$$.html"
  printf '<!doctype html><html><body style="margin:0;background:#888"><iframe src="%s" style="border:0;width:%spx;height:%spx;display:block"></iframe></body></html>' "$url" "$w" "$h" > "$frame"
  url="file://$frame"; win=600
fi
"$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-prefers-reduced-motion \
  --no-first-run --no-default-browser-check --virtual-time-budget=4000 \
  --user-data-dir="/tmp/terroir-chrome-$$" --window-size="$win,$h" --screenshot="$out" \
  "$url" >/dev/null 2>&1 &
pid=$!
for _ in $(seq 1 80); do
  [ -s "$out" ] && break
  sleep 0.5
done
sleep 0.5
kill "$pid" 2>/dev/null; pkill -f "terroir-chrome-$$" 2>/dev/null
rm -rf "/tmp/terroir-chrome-$$" "/tmp/terroir-frame-$$.html"
[ -s "$out" ] && echo "$out" || { echo "screenshot failed" >&2; exit 1; }
