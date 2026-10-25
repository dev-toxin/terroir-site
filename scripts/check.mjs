#!/usr/bin/env node
/**
 * Self-check of the built site in dist/ (no external deps). Run via scripts/check.sh.
 * Fails (exit 1) on: broken internal links/anchors, missing title/description/canonical/hreflang,
 * duplicate titles/descriptions per language, ≠1 <h1>, missing lang, img without alt,
 * external requests to font/CDN hosts, inline scripts/styles (CSP), page weight budgets.
 */
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';

const DIST = new URL('../dist/', import.meta.url).pathname;
const errors = [];
const warns = [];
const err = (f, m) => errors.push(`${f}: ${m}`);

function walk(dir, out = []) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    statSync(p).isDirectory() ? walk(p, out) : out.push(p);
  }
  return out;
}
const files = walk(DIST);
const html = files.filter((f) => f.endsWith('.html'));
const rel = (f) => '/' + relative(DIST, f);

const ids = new Map();
const pages = new Map();
for (const f of html) {
  const s = readFileSync(f, 'utf8');
  pages.set(f, s);
  ids.set(f, new Set([...s.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])));
}

function resolve(from, href) {
  const [pathPart, hash] = href.split('#');
  let p = pathPart === '' ? '/' + relative(DIST, from) : pathPart;
  if (!p.startsWith('/')) p = '/' + relative(DIST, join(dirname(from), p));
  let target = join(DIST, p);
  if (p.endsWith('/')) target = join(target, 'index.html');
  else if (!existsSync(target) && existsSync(target + '.html')) target += '.html';
  else if (existsSync(target) && statSync(target).isDirectory()) target = join(target, 'index.html');
  return { target, hash };
}

const seen = { en: { t: new Map(), d: new Map() }, ru: { t: new Map(), d: new Map() } };
const BANNED = /fonts\.googleapis|fonts\.gstatic|cdn\.jsdelivr|unpkg\.com|cdnjs|use\.typekit|googletagmanager|google-analytics/;

for (const [f, s] of pages) {
  const name = rel(f);
  const is404 = /404/.test(name);
  const lang = (s.match(/<html[^>]*\slang="([^"]+)"/) || [])[1];
  if (!lang) err(name, 'missing <html lang>');
  const title = (s.match(/<title>([^<]*)<\/title>/) || [])[1];
  const desc = (s.match(/<meta name="description" content="([^"]*)"/) || [])[1];
  if (!title) err(name, 'missing <title>');
  if (!desc) err(name, 'missing meta description');
  if (desc && (desc.length < 70 || desc.length > 300)) warns.push(`${name}: description length ${desc.length}`);
  const h1 = (s.match(/<h1[\s>]/g) || []).length;
  if (h1 !== 1) err(name, `expected 1 <h1>, found ${h1}`);
  if (!is404) {
    if (!/<link rel="canonical"/.test(s)) err(name, 'missing canonical');
    for (const hl of ['en', 'ru', 'x-default']) if (!s.includes(`hreflang="${hl}"`)) err(name, `missing hreflang ${hl}`);
    if (!/property="og:image"/.test(s)) err(name, 'missing og:image');
    if (lang && seen[lang]) {
      for (const [k, v] of [['t', title], ['d', desc]]) {
        const m = seen[lang][k];
        if (m.has(v)) err(name, `duplicate ${k === 't' ? 'title' : 'description'} with ${m.get(v)}`);
        else m.set(v, name);
      }
    }
  }
  if (!s.includes('class="skip-link"')) err(name, 'missing skip link');
  for (const m of s.matchAll(/<img\b[^>]*>/g)) if (!/\salt=/.test(m[0])) err(name, `img without alt: ${m[0].slice(0, 80)}`);
  if (BANNED.test(s)) err(name, 'external font/CDN/tracker request');
  for (const m of s.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
    const attrs = m[1];
    if (/type="application\/ld\+json"/.test(attrs)) {
      try { JSON.parse(m[2]); } catch { err(name, 'invalid JSON-LD'); }
      continue;
    }
    if (!/\ssrc=/.test(attrs) && m[2].trim()) err(name, 'inline <script> (breaks CSP)');
  }
  if (/<style[\s>]/.test(s)) err(name, 'inline <style> (breaks CSP)');
  if (/\sstyle="/.test(s)) err(name, 'inline style="" attribute (breaks CSP)');

  // links
  for (const m of s.matchAll(/\s(?:href|src)="([^"]+)"/g)) {
    const href = m[1];
    if (/^(https?:|mailto:|tel:|data:)/.test(href) || href.startsWith('//')) continue;
    const { target, hash } = resolve(f, href);
    if (!existsSync(target)) { err(name, `broken link ${href}`); continue; }
    if (hash && target.endsWith('.html') && !(ids.get(target) || new Set()).has(hash)) err(name, `broken anchor ${href}`);
  }
}

// CSS / fonts referenced from CSS
for (const f of files.filter((x) => x.endsWith('.css'))) {
  const s = readFileSync(f, 'utf8');
  if (BANNED.test(s)) err(rel(f), 'external font/CDN in CSS');
  for (const m of s.matchAll(/url\(([^)]+)\)/g)) {
    const u = m[1].replace(/["']/g, '');
    if (/^(data:|https?:|#)/.test(u)) continue;
    const t = u.startsWith('/') ? join(DIST, u) : join(dirname(f), u);
    if (!existsSync(t)) err(rel(f), `missing CSS asset ${u}`);
  }
}

// Weight budget: home page HTML + CSS + JS + preloaded fonts
const size = (p) => statSync(p).size;
const kb = (n) => (n / 1024).toFixed(1) + ' KB';
const report = [];
for (const page of ['index.html', 'ru/index.html']) {
  const p = join(DIST, page);
  const s = readFileSync(p, 'utf8');
  const assets = new Set([...s.matchAll(/(?:href|src)="(\/_astro\/[^"]+)"/g)].map((m) => m[1]));
  let total = size(p);
  for (const a of assets) total += size(join(DIST, a));
  // fonts actually needed for this language (normal + italic display, text)
  const css = [...assets].filter((a) => a.endsWith('.css'));
  const sub = page.startsWith('ru') ? 'cyrillic' : 'latin';
  const fonts = files.filter((f) => f.includes('/_astro/') && f.endsWith('.woff2') && new RegExp(`-${sub}-wght`).test(f));
  for (const ft of fonts) total += size(ft);
  report.push(`${page}: ~${kb(total)} (HTML+CSS+JS+${fonts.length} fonts)`);
  if (total > 300 * 1024) err(page, `page weight ${kb(total)} > 300 KB`);
  void css;
}
const js = files.filter((f) => f.endsWith('.js')).reduce((a, f) => a + size(f), 0);
report.push(`JS total: ${kb(js)}`);
if (js > 10 * 1024) err('js', `JS ${kb(js)} > 10 KB`);

console.log(`Checked ${html.length} HTML files.`);
report.forEach((r) => console.log('  ' + r));
warns.forEach((w) => console.log('  warn: ' + w));
if (errors.length) {
  console.error(`\n${errors.length} problem(s):`);
  errors.forEach((e) => console.error('  ✗ ' + e));
  process.exit(1);
}
console.log('All checks passed ✓');
