// Measures the names' font (Amiri, as bundled in public/fonts) in Chromium
// and writes src/lib/layout/fontMetrics.json: the advance width (in ems) of
// every Latin character and of every Arabic letter in each of its joined
// forms, the wider of regular and bold, for the layout's textWidth.
// Re-run after changing the bundled fonts:  node scripts/font-metrics.mjs
// (Playwright is not one of the app's dependencies: the installed one, or PLAYWRIGHT_MODULE, as scripts/qa-report.mjs)
import { createRequire } from "node:module";
const { chromium } = process.env.PLAYWRIGHT_MODULE ? await import(process.env.PLAYWRIGHT_MODULE) : createRequire(import.meta.url)("playwright");
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const FONTS = "public/fonts";
const faces = readdirSync(FONTS).filter((f) => f.startsWith("amiri") && f.endsWith(".woff2")).map((f) => ({
  weight: /-700-/.test(f) ? 700 : 400,
  range: /latin/.test(f) ? "U+0000-024F,U+2000-206F" : "U+0600-06FF,U+0750-077F,U+08A0-08FF,U+FB50-FDFF,U+FE70-FEFF,U+200C-200F",
  data: readFileSync(join(FONTS, f)).toString("base64"),
}));

const latin = [];
for (let c = 0x20; c <= 0x7e; c++) latin.push(String.fromCharCode(c));
for (let c = 0xa0; c <= 0xff; c++) latin.push(String.fromCharCode(c));
latin.push("–", "—", "‘", "’", "“", "”", "…", "·");
const arabic = [];
for (let c = 0x0621; c <= 0x064a; c++) arabic.push(String.fromCharCode(c));
arabic.push("ٱ", "پ", "چ", "ژ", "ک", "گ", "ی", "ـ");
const digits = [];
for (let c = 0x0660; c <= 0x0669; c++) digits.push(String.fromCharCode(c));
const other = ["﴾", "﴿", "،", "؛", "؟", "٫", "٬", ...digits];
const lamAlef = ["لا", "لأ", "لإ", "لآ"];

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent("<html><body></body></html>");
const metrics = await page.evaluate(async ({ faces, latin, arabic, other, lamAlef }) => {
  for (const f of faces) {
    const face = new FontFace("Amiri", `url(data:font/woff2;base64,${f.data})`, { weight: String(f.weight), unicodeRange: f.range });
    document.fonts.add(await face.load());
  }
  const ctx = document.createElement("canvas").getContext("2d");
  const SIZE = 1000;
  const width = (s) => Math.max(...[400, 700].map((w) => { ctx.font = `${w} ${SIZE}px Amiri`; ctx.direction = "rtl"; return ctx.measureText(s).width; })) / SIZE;
  const T = "ـ"; // tatweel: joins on both sides
  const round = (v) => Math.round(v * 10000) / 10000;
  const out = { latin: {}, arabic: {}, other: {}, lamAlef: {}, tatweel: round(width(T)) };
  for (const ch of latin) out.latin[ch] = round(width(ch));
  for (const ch of other) out.other[ch] = round(width(ch));
  const t = width(T);
  for (const ch of arabic) {
    // isolated, initial (joined to the next), medial (both), final (joined to the previous)
    out.arabic[ch] = [width(ch), width(ch + T) - t, width(T + ch + T) - 2 * t, width(T + ch) - t].map((v) => round(Math.max(0, v)));
  }
  for (const pair of lamAlef) out.lamAlef[pair] = [width(pair), width(T + pair) - t].map((v) => round(Math.max(0, v)));
  // Letter pairs the font draws differently from the two letters' own forms
  // (ligatures such as مح, kerning such as ري): the difference, by context
  // (bit 1: joined to a letter before the pair, bit 2: to one after it).
  const RIGHT_ONLY = new Set("آأؤإاٱةدذرزوژ"), NON = new Set("ء");
  const fwd = (c) => c in out.arabic && !RIGHT_ONLY.has(c) && !NON.has(c);
  const back = (c) => c in out.arabic && !NON.has(c);
  const formW = (c, before, after) => out.arabic[c][before && after ? 2 : before ? 3 : after ? 1 : 0];
  out.pairs = {};
  for (const a of arabic) for (const b of arabic) {
    if (a === "\u0640" || b === "\u0640" || (a === "\u0644" && "اأإآ".includes(b))) continue;
    for (let ctx = 0; ctx < 4; ctx++) {
      const L = ctx & 1 && fwd(a) !== undefined ? T : "", R = ctx & 2 ? T : "";
      if ((ctx & 1 && !back(a)) || (ctx & 2 && !fwd(b))) continue;
      const join = fwd(a) && back(b);
      const expected = formW(a, !!(ctx & 1), join) + formW(b, join, !!(ctx & 2));
      const d = width(L + a + b + R) - (L ? t : 0) - (R ? t : 0) - expected;
      if (Math.abs(d) > 0.01) out.pairs[a + b + ctx] = round(d);
    }
  }
  // Words the font draws as one ligature (محمد, the name of God): their
  // widths whole, by context as the pairs.
  out.words = {};
  for (const word of ["محمد", "الله", "لله"]) {
    out.words[word] = [0, 1, 2, 3].map((ctx) => {
      const L = ctx & 1 ? T : "", R = ctx & 2 ? T : "";
      return round(width(L + word + R) - (L ? t : 0) - (R ? t : 0));
    });
  }
  return out;
}, { faces, latin, arabic, other, lamAlef });
await browser.close();
writeFileSync("src/lib/layout/fontMetrics.json", JSON.stringify(metrics) + "\n");
console.log(`fontMetrics.json: ${Object.keys(metrics.latin).length} Latin, ${Object.keys(metrics.arabic).length} Arabic letters (4 forms), ${Object.keys(metrics.lamAlef).length} lam-alef`);

// With a list of names (a JSON array) and an output path: their true widths,
// measured the same way, for tests/text-width.test.ts.
//   node scripts/font-metrics.mjs names.json tests/fixtures/name-widths.json
if (process.argv[2] && process.argv[3]) {
  const names = JSON.parse(readFileSync(process.argv[2], "utf8"));
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.setContent("<html><body></body></html>");
  const widths = await p.evaluate(async ({ faces, names }) => {
    for (const f of faces) document.fonts.add(await new FontFace("Amiri", `url(data:font/woff2;base64,${f.data})`, { weight: String(f.weight), unicodeRange: f.range }).load());
    const ctx = document.createElement("canvas").getContext("2d");
    return names.map((n) => [n, Math.round(Math.max(...[400, 700].map((w) => { ctx.font = `${w} 1000px Amiri`; return ctx.measureText(n).width; })) * 10) / 10000]);
  }, { faces, names });
  await b.close();
  writeFileSync(process.argv[3], JSON.stringify(Object.fromEntries(widths)) + "\n");
  console.log(`${process.argv[3]}: ${widths.length} names`);
}
