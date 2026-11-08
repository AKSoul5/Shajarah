// The poster stress test's export stage (tests/stress/README.md): the app's
// own editor (/demo, local mode) and its own Export menu, driven in Chromium
// as a person would. For each case it waits for the poster, chooses the
// paper, exports SVG and PDF, and checks the files: the PDF opens with one
// page of the paper's size, the SVG parses with the paper's size and the
// poster's viewBox, and every font the poster uses is embedded.
//
//   node tests/stress/export.mjs <base url> <cases.json> <out dir>
// cases.json: [{ "family": "huge", "lang": "ar", "preset": "refined", "paper": "2A0" }, ...]
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { appendFileSync, mkdirSync, readFileSync, statSync, existsSync } from "node:fs";

const [, , base, casesFile, out] = process.argv;
const cases = JSON.parse(readFileSync(casesFile, "utf8"));
mkdirSync(`${out}/files`, { recursive: true });
const results = `${out}/export.jsonl`;
const done = new Set(existsSync(results) ? readFileSync(results, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l).id) : []);
const MM = { A3: [297, 420], A2: [420, 594], A1: [594, 841], A0: [841, 1189] };
const paperMm = (p) => {
  if (MM[p]) return MM[p];
  let [w, h] = MM.A0;
  for (let n = 1; n < Number.parseInt(p, 10); n *= 2) [w, h] = [h, w * 2];
  return [w, h];
};

const browser = await chromium.launch();
for (const c of cases) {
  const id = [c.family, c.lang, c.preset, c.paper].join("_");
  if (done.has(id)) continue;
  const row = { id, ...c };
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 300)));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 300)); });
  try {
    const t0 = Date.now();
    await page.goto(`${base}/demo?sample=stress-${c.family}&lang=${c.lang}&preset=${c.preset}&poster=${c.paper}&show=all`, { waitUntil: "load", timeout: 600000 });
    // the poster is laid out when its names stop changing
    let last = -1, stable = 0;
    for (let i = 0; i < 1200 && stable < 4; i++) {
      await page.waitForTimeout(1000);
      const n = await page.evaluate(() => Math.max(0, ...[...document.querySelectorAll("svg")].map((s) => s.querySelectorAll("text").length)));
      stable = n > 3 && n === last ? stable + 1 : 0;
      last = n;
    }
    row.layoutMs = Date.now() - t0;
    row.texts = last;
    // the Export menu: choose the paper, then each format
    await page.locator("button[aria-expanded]").filter({ hasText: /Export|تصدير/ }).first().click();
    await page.locator("select").first().selectOption(c.paper);
    for (const [kind, label] of [["svg", /SVG/], ["pdf", /PDF/]]) {
      const t1 = Date.now();
      const [dl] = await Promise.all([
        page.waitForEvent("download", { timeout: 1800000 }),
        page.locator("button").filter({ hasText: label }).filter({ hasNotText: /tile|بلاط|A4|A3 sheets/i }).first().click(),
      ]);
      const file = `${out}/files/${id}.${kind}`;
      await dl.saveAs(file);
      row[`${kind}Ms`] = Date.now() - t1;
      row[`${kind}Bytes`] = statSync(file).size;
    }
    // the PDF: opens, one page, the paper's size (pdfinfo reports points)
    const info = execFileSync("pdfinfo", [`${out}/files/${id}.pdf`], { encoding: "utf8" });
    const pages = Number(/Pages:\s+(\d+)/.exec(info)?.[1]);
    const [pw, ph] = (/Page size:\s+([\d.]+) x ([\d.]+) pts/.exec(info) ?? []).slice(1).map((v) => (Number(v) * 25.4) / 72);
    const [ew, eh] = paperMm(c.paper);
    row.pdf = { pages, wMm: Math.round(pw), hMm: Math.round(ph), sizeOk: pages === 1 && Math.abs(pw - ew) < 1 && Math.abs(ph - eh) < 1 };
    // the SVG: parses, the paper's size, the poster's viewBox, fonts embedded
    const svg = readFileSync(`${out}/files/${id}.svg`, "utf8");
    let parses = true;
    try { execFileSync("xmllint", ["--noout", `${out}/files/${id}.svg`], { stdio: "pipe" }); } catch { parses = false; }
    const w = /<svg[^>]*\swidth="([\d.]+)mm"/.exec(svg)?.[1], h = /<svg[^>]*\sheight="([\d.]+)mm"/.exec(svg)?.[1];
    const families = [...new Set([...svg.matchAll(/font-family[=:]\s*"?'?([^"';,)]+)/g)].map((m) => m[1].trim()))];
    const embedded = [...svg.matchAll(/@font-face\s*{[^}]*font-family:\s*["']?([^"';]+)/g)].map((m) => m[1].trim());
    row.svg = {
      parses, wMm: Number(w), hMm: Number(h), sizeOk: Math.abs(Number(w) - ew) < 1 && Math.abs(Number(h) - eh) < 1,
      viewBox: /<svg[^>]*viewBox="0 0 [\d.]+ [\d.]+"/.test(svg),
      fontsMissing: families.filter((f) => !/serif|sans-serif|inherit|monospace/i.test(f) && !embedded.some((e) => e.toLowerCase() === f.toLowerCase())),
    };
  } catch (e) {
    row.error = String(e).slice(0, 500);
  }
  row.pageErrors = errors;
  appendFileSync(results, JSON.stringify(row) + "\n");
  console.log(JSON.stringify({ id, ok: !row.error, pdf: row.pdf, svg: row.svg, layoutMs: row.layoutMs, errors: errors.length }));
  await page.close();
}
await browser.close();
