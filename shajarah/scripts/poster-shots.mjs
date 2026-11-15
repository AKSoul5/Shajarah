// Renders the output of tests/tools/poster-shots.test.ts: for each poster a
// whole-poster PNG and a close-up of the canopy base (about 300 × 200 mm of
// paper), and measures the trunk's drawn width just above the ground and just
// under the canopy base. With two folders it also writes side-by-side
// before/after sheets and a table of the numbers.
//
//   node scripts/poster-shots.mjs <dir>                 render one run
//   node scripts/poster-shots.mjs <before> <after> <out> compare two runs
//
// (Playwright is not one of the app's dependencies: the installed one, or PLAYWRIGHT_MODULE.)
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright");
const fontDir = resolve("public/fonts");
const FAM = { amiri: "Amiri", "aref-ruqaa": "Aref Ruqaa", "noto-kufi-arabic": "Noto Kufi Arabic" };
const css = Object.keys(FAM).flatMap((f) => [400, 700].flatMap((wt) => ["arabic", "latin"].map((s) => `@font-face{font-family:"${FAM[f]}";font-weight:${wt};src:url(file://${fontDir}/${f}-${s}-${wt}-normal.woff2)}`))).join("");
const browser = await chromium.launch({ executablePath: existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined, args: ["--allow-file-access-from-files"] });
const page = await browser.newPage();

async function render(svg, out, px, vb) {
  let s = svg.replace(/<svg([^>]*?)\swidth="[^"]*"/, "<svg$1").replace(/<svg([^>]*?)\sheight="[^"]*"/, "<svg$1");
  const full = s.match(/viewBox="([^"]+)"/)[1].split(/[ ,]+/).map(Number);
  const box = vb ?? full;
  s = s.replace(/viewBox="[^"]+"/, `viewBox="${box.join(" ")}"`);
  const h = Math.round((px * box[3]) / box[2]);
  await page.setViewportSize({ width: px, height: h });
  await page.setContent(`<html><head><style>${css} body{margin:0;background:#fff}</style></head><body>${s.replace("<svg", `<svg width="${px}" height="${h}"`)}</body></html>`);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: out });
}

/** The trunk outline's width (in layout units) at each height in ys: its leftmost and rightmost crossing. */
async function widths(d, ys) {
  return page.evaluate(({ d, ys }) => {
    const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
    p.setAttribute("d", d);
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.appendChild(p);
    document.body.appendChild(svg);
    const L = p.getTotalLength();
    const pts = Array.from({ length: 4001 }, (_, i) => p.getPointAtLength((L * i) / 4000));
    svg.remove();
    return ys.map((y) => {
      const xs = [];
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1], b = pts[i];
        if ((a.y - y) * (b.y - y) <= 0 && a.y !== b.y) xs.push(a.x + ((y - a.y) / (b.y - a.y)) * (b.x - a.x));
      }
      return xs.length >= 2 ? Math.max(...xs) - Math.min(...xs) : null;
    });
  }, { d, ys });
}

async function renderRun(dir) {
  const m = JSON.parse(readFileSync(`${dir}/measurements.json`, "utf8"));
  mkdirSync(`${dir}/png`, { recursive: true });
  for (const [id, x] of Object.entries(m)) {
    const svg = readFileSync(`${dir}/${id}.svg`, "utf8");
    await render(svg, `${dir}/png/${id}_poster.png`, 1400);
    if (x.baseBox) await render(svg, `${dir}/png/${id}_base.png`, 1400, [x.baseBox.x, x.baseBox.y, x.baseBox.w, x.baseBox.h]);
    if (x.trunk.path && x.trunk.topY != null) {
      const span = x.trunk.groundY - x.trunk.topY;
      const [ground, top] = await widths(x.trunk.path, [x.trunk.groundY - span * 0.04, x.trunk.topY + span * 0.04]);
      x.trunkDrawn = { groundMm: ground && Math.round(ground * x.mmPerUnit * 10) / 10, topMm: top && Math.round(top * x.mmPerUnit * 10) / 10 };
    }
    delete x.trunk;
    delete x.baseBox;
  }
  writeFileSync(`${dir}/numbers.json`, JSON.stringify(m, null, 2));
  return m;
}

async function sheet(a, b, out, title) {
  const img = (f) => `data:image/png;base64,${readFileSync(f).toString("base64")}`;
  await page.setViewportSize({ width: 2000, height: 600 });
  await page.setContent(`<html><body style="margin:0;font:22px sans-serif;background:#fff">
    <div style="padding:8px 12px;font-weight:bold">${title}</div>
    <div style="display:flex;gap:16px;padding:0 12px 12px">
      <div style="flex:1"><div>before</div><img src="${img(a)}" style="width:100%;border:1px solid #ccc"></div>
      <div style="flex:1"><div>after</div><img src="${img(b)}" style="width:100%;border:1px solid #ccc"></div>
    </div></body></html>`);
  await page.waitForLoadState("load");
  await page.screenshot({ path: out, fullPage: true });
}

const [a, b, out] = process.argv.slice(2).map((p) => resolve(p));
if (!b) {
  console.log(JSON.stringify(await renderRun(a), null, 1));
} else {
  const before = existsSync(`${a}/numbers.json`) ? JSON.parse(readFileSync(`${a}/numbers.json`, "utf8")) : await renderRun(a);
  const after = await renderRun(b);
  mkdirSync(out, { recursive: true });
  for (const id of Object.keys(after)) {
    for (const kind of ["poster", "base"]) {
      const fa = `${a}/png/${id}_${kind}.png`, fb = `${b}/png/${id}_${kind}.png`;
      if (existsSync(fa) && existsSync(fb)) await sheet(fa, fb, `${out}/${id}_${kind}.png`, `${id} — ${kind === "base" ? "canopy base, about 300 × 200 mm" : "whole poster"}`);
    }
  }
  const rows = Object.keys(after).map((id) => ({ id, before: before[id], after: after[id] }));
  writeFileSync(`${out}/numbers.json`, JSON.stringify(rows, null, 2));
}
await browser.close();
