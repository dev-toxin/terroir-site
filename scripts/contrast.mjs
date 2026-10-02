#!/usr/bin/env node
// WCAG 2.x contrast check for the design-token text/background pairs actually used on the site.
const pairs = [
  // [fg, bg, label, min]
  ['#16050b', '#fbefe4', 'ink on parchment (body text)', 4.5],
  ['#16050b', '#fff3df', 'ink on cream (cards)', 4.5],
  ['#16050b', '#f6e6d6', 'ink on paper (alt sections)', 4.5],
  ['#5e4a4f', '#fbefe4', 'muted on parchment', 4.5],
  ['#5e4a4f', '#fff3df', 'muted on cream', 4.5],
  ['#5e4a4f', '#f6e6d6', 'muted on paper', 4.5],
  ['#76213d', '#fbefe4', 'merlot links/kickers on parchment', 4.5],
  ['#76213d', '#f6e6d6', 'merlot on paper', 4.5],
  ['#76213d', '#fff3df', 'merlot on cream', 4.5],
  ['#fff3df', '#76213d', 'cream on merlot (primary button)', 4.5],
  ['#fff3df', '#4d1026', 'cream on burgundy (button hover)', 4.5],
  ['#8f452f', '#fbefe4', 'terracotta-text on parchment (notes, tags)', 4.5],
  ['#8f452f', '#fff3df', 'terracotta-text on cream', 4.5],
  ['#8a6a2a', '#fbefe4', 'FAQ numbers (gold-dark) on parchment', 3.0],
  ['#a3242f', '#fff3df', 'form error on cream', 4.5],
  ['#fff3df', '#16050b', 'cream on ink (dark sections)', 4.5],
  ['#c2b2a9', '#16050b', 'muted-dark on ink', 4.5],
  ['#c2b2a9', '#241018', 'muted-dark on ink-2 (dark cards)', 4.5],
  ['#e2cc9a', '#16050b', 'gold-soft on ink (dark links, em)', 4.5],
  ['#c9a45c', '#16050b', 'gold on ink (kickers on dark)', 4.5],
  ['#16050b', '#fff3df', 'ink on cream (button on dark)', 4.5],
];
const lum = (hex) => {
  const c = hex.match(/\w\w/g).map((x) => parseInt(x, 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
let fail = 0;
for (const [fg, bg, label, min] of pairs) {
  const r = ratio(fg, bg);
  const ok = r >= min;
  if (!ok) fail++;
  console.log(`  ${ok ? '✓' : '✗'} ${r.toFixed(2).padStart(5)}:1  ${label}${min < 4.5 ? ' (large/decorative, ≥3)' : ''}`);
}
if (fail) { console.error(`${fail} pair(s) below AA`); process.exit(1); }
