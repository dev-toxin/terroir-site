#!/usr/bin/env node
// WCAG 2.x contrast check for the design-token text/background pairs actually used on the site.
// Palette «label & cellar» (2026-10-08): paper / ink / bordeaux / cellar / brass / umber / glass.
const pairs = [
  // [fg, bg, label, min]
  ['#1f1416', '#f3ece1', 'ink on paper (body text)', 4.5],
  ['#1f1416', '#faf6ef', 'ink on label stock (cards)', 4.5],
  ['#1f1416', '#e8dfd0', 'ink on dark paper (alt sections)', 4.5],
  ['#3a2a2c', '#f3ece1', 'ink-soft on paper (long text)', 4.5],
  ['#3a2a2c', '#e8dfd0', 'ink-soft on dark paper', 4.5],
  ['#55463f', '#f3ece1', 'muted on paper', 4.5],
  ['#55463f', '#faf6ef', 'muted on label stock', 4.5],
  ['#55463f', '#e8dfd0', 'muted on dark paper', 4.5],
  ['#6b1e2e', '#f3ece1', 'bordeaux links/kickers on paper', 4.5],
  ['#6b1e2e', '#e8dfd0', 'bordeaux on dark paper', 4.5],
  ['#6b1e2e', '#faf6ef', 'bordeaux on label stock', 4.5],
  ['#faf6ef', '#6b1e2e', 'label stock on bordeaux (primary button)', 4.5],
  ['#faf6ef', '#4e1220', 'label stock on deep bordeaux (button hover)', 4.5],
  ['#6a4a2c', '#f3ece1', 'umber text on paper (notes, tags, FAQ numbers)', 4.5],
  ['#6a4a2c', '#faf6ef', 'umber text on label stock', 4.5],
  ['#6a4a2c', '#e8dfd0', 'umber text on dark paper', 4.5],
  ['#3f4a35', '#f3ece1', 'glass green on paper (accent text)', 4.5],
  ['#a3242f', '#faf6ef', 'form error on label stock', 4.5],
  ['#faf6ef', '#2a0f17', 'label stock on cellar (dark sections)', 4.5],
  ['#cbbcb0', '#2a0f17', 'muted-dark on cellar', 4.5],
  ['#cbbcb0', '#3a1a24', 'muted-dark on raised cellar (dark cards)', 4.5],
  ['#d9c18f', '#2a0f17', 'brass-soft on cellar (dark links, em, kickers)', 4.5],
  ['#d9c18f', '#3a1a24', 'brass-soft on raised cellar', 4.5],
  ['#a8874f', '#2a0f17', 'brass on cellar (large numerals, ornaments)', 3.0],
  ['#1f1416', '#faf6ef', 'ink on label stock (button on dark)', 4.5],
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
