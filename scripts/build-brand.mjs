#!/usr/bin/env node
/**
 * Генератор бренд-ассетов Terroir (временный логотип, favicon, OG-картинки).
 *
 * Запуск (Node 22):  node scripts/build-brand.mjs
 *
 * Что делает:
 *  - переводит буквы из self-hosted Cormorant / Inter в SVG-контуры (fontkitten),
 *    поэтому логотип и OG не зависят от установленных шрифтов;
 *  - пишет исходники логотипа: src/assets/brand/logo.svg, src/assets/brand/mark.svg
 *    (currentColor — цвет задаётся CSS);
 *  - растеризует через sharp (уже есть в node_modules как зависимость Astro):
 *    public/favicon.svg, favicon.ico, apple-touch-icon.png, icon-192.png, icon-512.png,
 *    public/og/og-en.png, public/og/og-ru.png (1200×630).
 *
 * Когда появится настоящий логотип: замените src/assets/brand/logo.svg и mark.svg руками,
 * а favicon/OG перегенерируйте этим скриптом после правки функций markFavicon()/og() —
 * или просто положите свои файлы в public/. Подробно — docs/BRAND.md.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { create } from 'fontkitten';
import sharp from 'sharp';

const root = new URL('../', import.meta.url);
const p = (rel) => new URL(rel, root);

const C = {
  ink: '#16050b',
  graphite: '#121014',
  parchment: '#fbefe4',
  cream: '#fff3df',
  merlot: '#76213d',
  burgundy: '#4d1026',
  gold: '#c9a45c',
  terracotta: '#a85a42',
  muted: '#5e4a4f',
};

// ── шрифты ────────────────────────────────────────────────────────────────
const fonts = {};
function font(name) {
  if (!fonts[name]) fonts[name] = create(readFileSync(p(`src/assets/fonts/${name}.woff2`)));
  return fonts[name];
}
// Глиф может отсутствовать в одном подмножестве — ищем по списку файлов.
function glyph(files, ch) {
  for (const f of files) {
    const fo = font(f);
    const g = fo.glyphForCodePoint(ch.codePointAt(0));
    if (g && g.id !== 0) return { g, upm: fo.unitsPerEm };
  }
  throw new Error(`No glyph for "${ch}" in ${files.join(', ')}`);
}

const SERIF = ['cormorant-latin-wght-normal', 'cormorant-latin-ext-wght-normal', 'cormorant-cyrillic-wght-normal'];
const SERIF_IT = ['cormorant-latin-wght-italic', 'cormorant-latin-ext-wght-italic', 'cormorant-cyrillic-wght-italic'];
const SANS = ['inter-latin-wght-normal', 'inter-latin-ext-wght-normal', 'inter-cyrillic-wght-normal'];

/**
 * Текст → один <path d>. Без кернинга (fontkitten не делает layout),
 * поэтому `tracking` (в единицах em/1000) и ручные поправки `kern` по индексу.
 */
function textPath(str, { files, size, x = 0, y = 0, tracking = 0, kern = {} }) {
  let cursor = 0;
  const parts = [];
  let i = 0;
  let upmRef = 1000;
  for (const ch of str) {
    if (ch === ' ') {
      const { g, upm } = glyph(files, 'n');
      upmRef = upm;
      cursor += g.advanceWidth * 0.62 + tracking;
      i++;
      continue;
    }
    const { g, upm } = glyph(files, ch);
    upmRef = upm;
    const s = size / upm;
    const d = g.path.toSVG();
    if (d) {
      const ox = x + (cursor + (kern[i] || 0)) * s;
      parts.push(`<path transform="translate(${r(ox)} ${r(y)}) scale(${r(s, 5)} ${r(-s, 5)})" d="${d}"/>`);
    }
    cursor += g.advanceWidth + tracking + (kern[i] || 0);
    i++;
  }
  return { svg: parts.join(''), width: (cursor - tracking) * (size / upmRef) };
}
const r = (n, d = 2) => Number(n.toFixed(d));

// ── логотип (вордмарк) ───────────────────────────────────────────────────
// «Terroir» прямой антиквой + три тонкие линии «слоя почвы» под словом.
function logo() {
  const size = 100;
  const base = 78;
  const t = textPath('Terroir', { files: SERIF, size, x: 2, y: base, tracking: 6, kern: { 1: -46 } });
  const w = Math.ceil(t.width + 6);
  const strata = `
    <path d="M2 ${base + 12}H${w - 2}" stroke-width="1.6"/>
    <path d="M${r(w * 0.18)} ${base + 18}H${r(w * 0.82)}" stroke-width="1.1" opacity=".7"/>
    <path d="M${r(w * 0.36)} ${base + 23}H${r(w * 0.64)}" stroke-width=".9" opacity=".45"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${base + 26}" role="img" aria-label="Terroir">
  <title>Terroir</title>
  <g fill="currentColor" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round">${t.svg}</g>
  <g fill="none" stroke="currentColor" stroke-linecap="round">${strata}
  </g>
</svg>
`;
}

// ── знак (монограмма) ────────────────────────────────────────────────────
// Курсивная «T» в овальной «этикетке» с линией почвы.
function markGlyph(size, cx, base, files = SERIF_IT) {
  const t = textPath('T', { files, size });
  const x = cx - t.width / 2;
  return textPath('T', { files, size, x, y: base }).svg;
}
function mark() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="Terroir">
  <title>Terroir</title>
  <rect x="3" y="3" width="58" height="58" rx="14" fill="none" stroke="currentColor" stroke-width="2"/>
  <g fill="currentColor" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round">${markGlyph(52, 33, 44)}</g>
  <path d="M17 50.5H47" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
</svg>
`;
}
// Для favicon: залитый мерло-квадрат, кремовая «T», крупнее и жирнее (читается в 16 px).
function markFavicon() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="${C.merlot}"/>
  <g fill="${C.cream}" stroke="${C.cream}" stroke-width="3.2" stroke-linejoin="round">${markGlyph(60, 33, 47, SERIF)}</g>
  <path d="M15 53.5H49" fill="none" stroke="${C.gold}" stroke-width="3" stroke-linecap="round"/>
</svg>
`;
}

// ── OG 1200×630 ──────────────────────────────────────────────────────────
function og(lang) {
  const copy = {
    en: {
      kicker: 'EARLY ACCESS  ·  WEB APP & TELEGRAM',
      lines: [['What to open', SERIF], ['tonight — from', SERIF], ['your own cellar.', SERIF_IT]],
      foot: 'A personal wine assistant that remembers your cellar, your taste and your kitchen.',
    },
    ru: {
      kicker: 'РАННИЙ ДОСТУП  ·  ВЕБ И TELEGRAM',
      lines: [['Что открыть', SERIF], ['сегодня — из', SERIF], ['своего погреба.', SERIF_IT]],
      foot: 'Личный винный помощник, который помнит ваш погреб, вкус и кухню.',
    },
  }[lang];

  const M = 72;
  const heads = copy.lines
    .map(([s, files], i) => textPath(s, { files, size: 104, x: M - 4, y: 232 + i * 102, tracking: -4 }).svg)
    .join('');
  const kicker = textPath(copy.kicker, { files: SANS, size: 19, x: M, y: 118, tracking: 120 }).svg;
  const foot = textPath(copy.foot, { files: SANS, size: 24, x: M, y: 560 }).svg;
  const word = textPath('Terroir', { files: SERIF, size: 54, x: 0, y: 0, tracking: 6, kern: { 1: -46 } });
  const wx = 1200 - M - word.width;
  const wordPlaced = textPath('Terroir', { files: SERIF, size: 54, x: wx, y: 122, tracking: 6, kern: { 1: -46 } }).svg;

  // «этикетка» бутылки справа: окно питья полосой
  const card = `
  <g transform="translate(842 214)">
    <rect width="286" height="236" rx="6" fill="${C.cream}" stroke="${C.gold}" stroke-width="1.5"/>
    <rect x="9" y="9" width="268" height="218" rx="3" fill="none" stroke="${C.gold}" stroke-width=".8" opacity=".7"/>
    <g fill="${C.ink}">${textPath(lang === 'en' ? 'Krasnostop' : 'Красностоп', { files: SERIF, size: 40, x: 28, y: 70, tracking: 4 }).svg}</g>
    <g fill="${C.muted}">${textPath(lang === 'en' ? 'Kuban  ·  2019  ·  2 bottles' : 'Кубань  ·  2019  ·  2 бутылки', { files: SANS, size: 15, x: 30, y: 102 }).svg}</g>
    <path d="M30 160H256" stroke="${C.ink}" stroke-opacity=".25" stroke-width="2"/>
    <path d="M86 160H206" stroke="${C.merlot}" stroke-width="5" stroke-linecap="round"/>
    <circle cx="150" cy="160" r="8" fill="${C.cream}" stroke="${C.merlot}" stroke-width="3"/>
    <g fill="${C.muted}">${textPath('2022', { files: SANS, size: 14, x: 30, y: 192 }).svg}${textPath('2031', { files: SANS, size: 14, x: 222, y: 192 }).svg}</g>
    <g fill="${C.merlot}">${textPath(lang === 'en' ? 'at its peak' : 'на пике', { files: SERIF_IT, size: 22, x: 120, y: 140 }).svg}</g>
  </g>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="${C.parchment}"/>
  <rect x="28" y="28" width="1144" height="574" fill="none" stroke="${C.gold}" stroke-width="1.5"/>
  <rect x="38" y="38" width="1124" height="554" fill="none" stroke="${C.gold}" stroke-width=".8" opacity=".6"/>
  <g fill="${C.merlot}">${kicker}</g>
  <g fill="${C.burgundy}" stroke="${C.burgundy}" stroke-width="1.1">${wordPlaced}</g>
  <path d="M${r(wx)} 132H${1200 - M}" stroke="${C.burgundy}" stroke-width="1.2"/>
  <g fill="${C.ink}" stroke="${C.ink}" stroke-width="1.4" stroke-linejoin="round">${heads}</g>
  ${card}
  <path d="M${M} 512H${1200 - M}" stroke="${C.gold}" stroke-width="1"/>
  <g fill="${C.muted}">${foot}</g>
</svg>
`;
}

// ── ICO из PNG (формат ICO допускает PNG внутри) ─────────────────────────
function ico(pngs) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngs.length, 4);
  const dir = Buffer.alloc(16 * pngs.length);
  let offset = 6 + dir.length;
  pngs.forEach(({ size, buf }, i) => {
    const o = i * 16;
    dir.writeUInt8(size >= 256 ? 0 : size, o);
    dir.writeUInt8(size >= 256 ? 0 : size, o + 1);
    dir.writeUInt8(0, o + 2);
    dir.writeUInt8(0, o + 3);
    dir.writeUInt16LE(1, o + 4);
    dir.writeUInt16LE(32, o + 6);
    dir.writeUInt32LE(buf.length, o + 8);
    dir.writeUInt32LE(offset, o + 12);
    offset += buf.length;
  });
  return Buffer.concat([header, dir, ...pngs.map((x) => x.buf)]);
}

// ── запись ───────────────────────────────────────────────────────────────
mkdirSync(p('src/assets/brand/'), { recursive: true });
mkdirSync(p('public/og/'), { recursive: true });

writeFileSync(p('src/assets/brand/logo.svg'), logo());
writeFileSync(p('src/assets/brand/mark.svg'), mark());

const fav = markFavicon();
writeFileSync(p('public/favicon.svg'), fav);
const png = (svg, size) => sharp(Buffer.from(svg), { density: 300 }).resize(size, size).png({ compressionLevel: 9 }).toBuffer();
const icoBufs = [];
for (const size of [16, 32, 48]) icoBufs.push({ size, buf: await png(fav, size) });
writeFileSync(p('public/favicon.ico'), ico(icoBufs));
writeFileSync(p('public/apple-touch-icon.png'), await png(fav.replace('rx="14"', 'rx="0"'), 180));
writeFileSync(p('public/icon-192.png'), await png(fav, 192));
writeFileSync(p('public/icon-512.png'), await png(fav, 512));

for (const lang of ['en', 'ru']) {
  const svg = og(lang);
  writeFileSync(p(`src/assets/brand/og-${lang}.svg`), svg);
  const out = await sharp(Buffer.from(svg)).png({ compressionLevel: 9, palette: true, quality: 90 }).toBuffer();
  writeFileSync(p(`public/og/og-${lang}.png`), out);
}
console.log('brand assets written');
