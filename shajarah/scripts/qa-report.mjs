// Layout QA report: contact sheets, close-ups and full-size renders from the
// QA suite's output (run the suite first: QA_LAYOUT=1 QA_OUT=<dir> npx vitest
// run tests/qa). Usage: node scripts/qa-report.mjs <dir>
// (needs Playwright with Chromium; set PLAYWRIGHT_MODULE to its index.mjs if
// it is installed globally)
// Writes <dir>/index.html (and report.md): per fixture and paper a sheet of
// the 4 display modes × 7 designs with each case's defect count; a close-up
// of every defect (up to CROPS_PER_CASE per case) and a sample of the
// crossings and near misses kept for review; the hardest cases at full size.
import { mkdirSync, readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

// (Playwright is not one of the app's dependencies: the installed one, or PLAYWRIGHT_MODULE)
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright");
const dir = resolve(process.argv[2] ?? "qa-report");
const CROPS_PER_CASE = 6, REVIEW_PER_CASE = 2, FULL_SIZE = 5;
const DEFECTS = ["missing", "misattached", "occlusion", "crossing", "merge", "junction", "trunk-order", "label-overlap", "soil-text-overlap", "soil-over-canopy", "soil-over-key"];
const cases = readdirSync(`${dir}/json`).map((f) => JSON.parse(readFileSync(`${dir}/json/${f}`, "utf8")));
const fontDir = resolve("public/fonts");
const FAM = { amiri: "Amiri", "aref-ruqaa": "Aref Ruqaa", "noto-kufi-arabic": "Noto Kufi Arabic" };
const css = Object.keys(FAM).flatMap((f) => [400, 700].flatMap((wt) => ["arabic", "latin"].map((s) => `@font-face{font-family:"${FAM[f]}";font-weight:${wt};src:url(file://${fontDir}/${f}-${s}-${wt}-normal.woff2)}`))).join("");
for (const d of ["thumbs", "crops", "full"]) mkdirSync(`${dir}/${d}`, { recursive: true });

const browser = await chromium.launch({ executablePath: existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined, args: ["--allow-file-access-from-files"] });
const page = await browser.newPage();
/** Renders an SVG (optionally only the region vb = [x, y, w, h]) at `px` wide. */
async function render(svg, out, px, vb) {
  let s = svg.replace(/<svg([^>]*?)\swidth="[^"]*"/, "<svg$1").replace(/<svg([^>]*?)\sheight="[^"]*"/, "<svg$1");
  const full = s.match(/viewBox="([^"]+)"/)[1].split(/[ ,]+/).map(Number);
  const box = vb ?? full;
  s = s.replace(/viewBox="[^"]+"/, `viewBox="${box.join(" ")}"`);
  const h = Math.round((px * box[3]) / box[2]);
  await page.setViewportSize({ width: px, height: h });
  await page.setContent(`<html><head><style>${css} body{margin:0}</style></head><body>${s.replace("<svg", `<svg width="${px}" height="${h}"`)}</body></html>`);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: out });
}

const fixtures = [...new Set(cases.map((c) => c.fixture))].sort();
const papers = ["A3", "A2", "A1", "2A0", "4A0"];
const modes = ["males", "daughters", "spouses", "all"];
const themes = ["refined", "luxe", "heritage", "silver-gold", "classic", "emerald", "mono"];
const clean = cases.filter((c) => !c.defects && c.summary.legible).length;
const tangled = cases.filter((c) => c.defects && c.summary.legible).length;
const small = cases.filter((c) => !c.summary.legible).length;
const summary = `${cases.length} cases: ${clean} clean and legible; ${tangled} legible with defects; ${small} with names below the legible size (${cases.filter((c) => !c.summary.legible && c.defects).length} of them also with defects). A dense poster that cannot be both is laid out either legible with defects or clean with small names; the editor then shows its "too dense" or "larger paper" notice.`;
let md = `# Layout QA report\n\n${summary}\n\nEach cell: defects / clear crossings / near misses; † names below the legible size.\nDefects: ${DEFECTS.join(", ")}. For review: clear-crossing, near-miss.\n\n`;
let html = `<!doctype html><meta charset="utf-8"><title>Layout QA</title><style>body{font:14px system-ui;margin:24px}table{border-collapse:collapse}td,th{border:1px solid #ccc;padding:4px;text-align:center;vertical-align:top}img{display:block}.bad{background:#fde2e2}.ok{background:#e6f4e6}.small{background:#fdf0d5}figure{display:inline-block;margin:6px;font-size:12px;max-width:340px}</style><h1>Layout QA report</h1><p>${summary}</p><p>Each cell: defects / clear crossings / near misses. Red: defects; amber: names below the legible size.</p>`;

for (const fx of fixtures) for (const paper of papers) {
  const set = cases.filter((c) => c.fixture === fx && c.paper === paper && !c.id.split("_")[4]);
  if (!set.length) continue;
  md += `## ${fx} · ${paper}\n\n| mode | ${themes.join(" | ")} |\n|---|${themes.map(() => "---").join("|")}|\n`;
  html += `<h2>${fx} · ${paper}</h2><table><tr><th></th>${themes.map((t) => `<th>${t}</th>`).join("")}</tr>`;
  for (const mode of modes) {
    md += `| ${mode} |`;
    html += `<tr><th>${mode}</th>`;
    for (const theme of themes) {
      const c = set.find((x) => x.mode === mode && x.theme === theme);
      if (!c) { md += " – |"; html += "<td>–</td>"; continue; }
      const cc = c.counts["clear-crossing"] ?? 0, nm = c.counts["near-miss"] ?? 0;
      md += ` ${c.defects} / ${cc} / ${nm}${c.summary.legible ? "" : " †"} |`;
      const thumb = `thumbs/${c.id}.png`;
      await render(readFileSync(`${dir}/svg/${c.id}.svg`, "utf8"), `${dir}/${thumb}`, 220);
      html += `<td class="${c.defects ? "bad" : c.summary.legible ? "ok" : "small"}"><a href="#${c.id}"><img src="${thumb}" width="160"></a>${c.defects} / ${cc} / ${nm}${c.summary.legible ? "" : "<br>not legible"}</td>`;
    }
    md += "\n";
    html += "</tr>";
  }
  md += "\n";
  html += "</table>";
}

// foundation stage
const soil = cases.filter((c) => c.id.split("_")[4]);
if (soil.length) {
  const styles = [...new Set(soil.map((c) => c.id.split("_")[4]))];
  md += `## Foundation styles (C, show all, A2)\n\n| style | ${themes.join(" | ")} |\n|---|${themes.map(() => "---").join("|")}|\n`;
  html += `<h2>Foundation styles (C, show all, A2)</h2><table><tr><th></th>${themes.map((t) => `<th>${t}</th>`).join("")}</tr>`;
  for (const st of styles) {
    md += `| ${st} |`;
    html += `<tr><th>${st}</th>`;
    for (const theme of themes) {
      const c = soil.find((x) => x.theme === theme && x.id.endsWith(`_${st}`));
      const soilDefects = DEFECTS.filter((k) => k.startsWith("soil")).reduce((a, k) => a + (c?.counts[k] ?? 0), 0);
      md += ` ${c ? `${c.defects} (foundation ${soilDefects})${c.summary.legible ? "" : " †"}` : "–"} |`;
      html += `<td class="${soilDefects ? "bad" : "ok"}">${c ? `${c.defects}<br>foundation: ${soilDefects}` : "–"}</td>`;
    }
    md += "\n";
    html += "</tr>";
  }
  md += "\n";
  html += "</table>";
}

// close-ups
html += "<h2>Close-ups</h2><p>Each finding centred; each close-up spans 8% of the poster’s width.</p>";
md += "## Close-ups\n\n";
for (const c of [...cases].sort((a, b) => b.defects - a.defects)) {
  const defects = c.findings.filter((f) => DEFECTS.includes(f.kind) && f.at).slice(0, CROPS_PER_CASE);
  const review = c.findings.filter((f) => !DEFECTS.includes(f.kind) && f.at).slice(0, REVIEW_PER_CASE);
  if (!defects.length && !review.length) continue;
  const svg = readFileSync(`${dir}/svg/${c.id}.svg`, "utf8");
  html += `<h3 id="${c.id}">${c.id} — ${c.defects} defects</h3><p>${Object.entries(c.counts).map(([k, v]) => `${k}: ${v}`).join(", ")}</p>`;
  md += `### ${c.id}\n\n${Object.entries(c.counts).map(([k, v]) => `${k}: ${v}`).join(", ")}\n\n`;
  for (const [i, f] of [...defects, ...review].entries()) {
    const r = c.summary.width * 0.04;
    const out = `crops/${c.id}_${i}.png`;
    await render(svg, `${dir}/${out}`, 340, [f.at.x - r, f.at.y - r * 0.7, 2 * r, 1.4 * r]);
    html += `<figure><img src="${out}" width="340"><figcaption><b>${f.kind}</b>${f.detail ? ` — ${f.detail}` : ""}<br>${(f.ids ?? []).join(" · ")}</figcaption></figure>`;
    md += `- ${f.kind}${f.detail ? ` (${f.detail})` : ""} at ${Math.round(f.at.x)}, ${Math.round(f.at.y)}: ${(f.ids ?? []).join(" · ")} — crops/${c.id}_${i}.png\n`;
  }
  md += "\n";
}

// the hardest cases at print size (300 DPI across the paper's width)
const MM = { A3: 297, A2: 420, A1: 594, A0: 841, "2A0": 1189, "4A0": 1682 };
html += "<h2>Hardest cases at full size</h2>";
md += "## Hardest cases at full size\n\n";
for (const c of [...cases].sort((a, b) => b.defects - a.defects).slice(0, FULL_SIZE)) {
  const px = Math.min(7000, Math.round((MM[c.paper] / 25.4) * 300));
  const out = `full/${c.id}.png`;
  await render(readFileSync(`${dir}/svg/${c.id}.svg`, "utf8"), `${dir}/${out}`, px);
  html += `<p><a href="${out}">${c.id}</a> — ${px} px wide (${c.defects} defects)</p>`;
  md += `- ${c.id}: full/${c.id}.png (${px} px wide, ${c.defects} defects)\n`;
}
writeFileSync(`${dir}/index.html`, html);
writeFileSync(`${dir}/report.md`, md);
await browser.close();
console.log(`report: ${dir}/index.html`);
