#!/usr/bin/env python3
"""Проверка горизонтального переполнения страниц на узких экранах через headless Chrome.

Почему через iframe: headless Chrome не делает окно уже ~500 px (--window-size=390 даёт
layout-viewport 500 px), поэтому настоящий узкий экран эмулируется так: скрипт поднимает свой
маленький HTTP-сервер над out/<site>/public и отдаёт страницу-обёртку /__frame с <iframe> нужной
ширины. Медиазапросы внутри iframe считаются от его ширины, как на телефоне. Обёртка после загрузки
меряет документ во фрейме, Chrome вызывается с --dump-dom, результат читается из DOM.
Без новых зависимостей: только python3 и установленный Chrome.

Проверяется:
  * documentElement.scrollWidth <= innerWidth внутри фрейма;
  * ни один видимый элемент не выходит правым краем за innerWidth (body с overflow-x: clip
    прячет переполнение от scrollWidth, но обрезает контент) — кроме содержимого
    контейнеров с собственной прокруткой (overflow-x: auto/scroll), а также .sr/.skip-link;
  * подписи <text> внутри каждого видимого SVG не пересекаются друг с другом и не выходят за SVG.

Режим --shot делает скриншот страницы нужной ширины (PNG обрезается до ширины фрейма через sips).

Код выхода 0 — всё в порядке, 1 — есть переполнение.
"""
import argparse
import functools
import html
import http.server
import json
import os
import re
import subprocess
import sys
import tempfile
import threading
import urllib.parse

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
DEFAULT_PAGES = [
    "/",
    "/ru/",
    "/early-access/",
    "/ru/early-access/",
    "/how-it-works/",
    "/journal/drinking-window/",
    "/features/",
    "/faq/",
]

FRAME = """<!doctype html><html><head><meta charset="utf-8"><style>
html,body{margin:0;padding:0;background:#888}iframe{display:block;margin:0 auto;border:0;width:%(w)dpx;height:%(h)dpx}
</style></head><body><iframe id="f" src="%(src)s"></iframe><pre id="mw-result"></pre><script>
var f = document.getElementById('f');
f.addEventListener('load', function () {
  var win = f.contentWindow, doc = f.contentDocument, W = win.innerWidth, bad = [];
  function scroller(el) {
    for (var p = el.parentElement; p && p !== doc.body; p = p.parentElement) {
      var o = win.getComputedStyle(p).overflowX;
      if (o === 'auto' || o === 'scroll') return true;
    }
    return false;
  }
  doc.querySelectorAll('body *').forEach(function (el) {
    if (el.closest('.sr, .skip-link, script, style')) return;
    var r = el.getBoundingClientRect();
    if (!r.width || !r.height) return;
    if (r.right > W + 0.5 && !scroller(el)) {
      var c = el.getAttribute('class');
      bad.push(el.tagName.toLowerCase() + (c ? '.' + c.trim().split(/\\s+/).join('.') : '') + '@' + Math.round(r.right));
    }
  });
  // Наложения текста: попарное пересечение видимых <text> внутри каждого SVG (с допуском 1 px)
  // и выход текста за границы самого SVG.
  var ov = [];
  doc.querySelectorAll('svg').forEach(function (svg) {
    var sr = svg.getBoundingClientRect();
    if (!sr.width || !sr.height || win.getComputedStyle(svg).display === 'none') return;
    var ts = [];
    svg.querySelectorAll('text').forEach(function (t) {
      var r = t.getBoundingClientRect();
      if (r.width && r.height && win.getComputedStyle(t).visibility !== 'hidden') ts.push({t: t.textContent.trim(), r: r});
    });
    var cls = (svg.getAttribute('class') || 'svg').split(' ').slice(-1)[0];
    ts.forEach(function (a, i) {
      if (a.r.left < sr.left - 1 || a.r.right > sr.right + 1 || a.r.top < sr.top - 1 || a.r.bottom > sr.bottom + 1) ov.push(cls + ':' + a.t + ' out');
      for (var j = i + 1; j < ts.length; j++) {
        var b = ts[j].r;
        if (a.r.left < b.right - 1 && b.left < a.r.right - 1 && a.r.top < b.bottom - 1 && b.top < a.r.bottom - 1) ov.push(cls + ':' + a.t + '×' + ts[j].t);
      }
    });
  });
  if (%(fit)s) f.style.height = doc.documentElement.scrollHeight + 'px';
  document.getElementById('mw-result').textContent = 'MW ' + JSON.stringify({sw: doc.documentElement.scrollWidth, iw: W, h: doc.documentElement.scrollHeight, bad: bad.slice(0, 6), nbad: bad.length, ov: ov.slice(0, 8), nov: ov.length});
});
</script></body></html>"""


class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def send_head(self):
        u = urllib.parse.urlsplit(self.path)
        if u.path == "/__frame":
            q = urllib.parse.parse_qs(u.query)
            body = FRAME % {
                "w": int(q["w"][0]),
                "h": int(q.get("h", ["1200"])[0]),
                "src": html.escape(q["p"][0]),
                "fit": "true" if q.get("fit") else "false",
            }
            data = body.encode()
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            import io
            return io.BytesIO(data)
        return super().send_head()


def chrome(args):
    cmd = [CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-first-run"] + args
    return subprocess.run(cmd, capture_output=True, text=True, timeout=90).stdout


def frame_url(base, page, width, height=1200, fit=False):
    q = {"w": width, "h": height, "p": page}
    if fit:
        q["fit"] = 1
    return base + "/__frame?" + urllib.parse.urlencode(q)


def measure(base, page, width, extra):
    out = chrome(extra + ["--window-size=800,1200", "--virtual-time-budget=3000", "--dump-dom", frame_url(base, page, width)])
    m = re.search(r"MW (\{.*?\})</pre>", out)
    return json.loads(html.unescape(m.group(1))) if m else None


def shot(base, page, width, height, path, extra):
    if width >= 500:
        chrome(extra + [f"--window-size={width},{height}", f"--screenshot={path}", base + page])
        return
    with tempfile.TemporaryDirectory() as d:
        tmp = os.path.join(d, "s.png")
        chrome(extra + [f"--window-size=500,{height}", "--virtual-time-budget=3000", f"--screenshot={tmp}",
                        frame_url(base, page, width, height)])
        subprocess.run(["sips", "-c", str(height), str(width), tmp, "--out", path],
                       capture_output=True, check=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default="dist")
    ap.add_argument("--widths", default="360,390")  # для проверки наложений на планшете и ПК: --widths 390,768,1280
    ap.add_argument("--shot", help="сделать скриншот первой страницы шириной из --widths (первое значение) в этот PNG")
    ap.add_argument("--height", type=int, default=2600)
    ap.add_argument("--chrome-arg", action="append", default=[], help="доп. флаг Chrome, напр. --blink-settings=preferredColorScheme=1")
    ap.add_argument("pages", nargs="*", default=DEFAULT_PAGES)
    args = ap.parse_args()
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Handler, directory=args.root))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    base = f"http://127.0.0.1:{srv.server_address[1]}"
    widths = [int(x) for x in args.widths.split(",")]
    if args.shot:
        shot(base, args.pages[0], widths[0], args.height, args.shot, args.chrome_arg)
        srv.shutdown()
        print("saved", args.shot)
        return
    failed = 0
    for page in args.pages:
        for w in widths:
            r = measure(base, page, w, args.chrome_arg)
            if r is None:
                print(f"FAIL {w}px {page}: no result from Chrome")
                failed += 1
                continue
            ok = r["sw"] <= r["iw"] and r["nbad"] == 0 and r["iw"] == w and r.get("nov", 0) == 0
            failed += not ok
            extra = ""
            if r["nbad"]:
                extra += f"; {r['nbad']} elements past the edge, e.g. {', '.join(r['bad'])}"
            if r.get("nov"):
                extra += f"; {r['nov']} SVG text overlaps, e.g. {', '.join(r['ov'])}"
            print(f"{'OK  ' if ok else 'FAIL'} {w}px {page}: scrollWidth={r['sw']} innerWidth={r['iw']}{extra}")
    srv.shutdown()
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
