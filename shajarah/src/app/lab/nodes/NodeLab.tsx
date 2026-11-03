"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { TreePoster } from "@/components/poster/TreePoster";
import { PAPER_SIZES } from "@/lib/paper";
import type { LabCase } from "@/lib/samples/nodeLab";
import type { ThemePreset } from "@/lib/types";
import type { LabChoice, LabLanguage, LabPoster } from "./page";

interface Tile {
  id: string;
  svg: string;
  label: string;
  shape: string;
  /** The name's type size on the printed A3 poster, in points. */
  pt: number;
  /** The box's frame, in poster units (the same for every design: all A3). */
  w: number;
  h: number;
}

const GROUPS: { key: string; title: string; test: (c: LabCase) => boolean }[] = [
  { key: "ordinary-with", title: "Ordinary name, with descendants", test: (c) => c.kind === "ordinary" && c.descendants },
  { key: "ordinary-without", title: "Ordinary name, no descendants", test: (c) => c.kind === "ordinary" && !c.descendants },
  { key: "long-with", title: "Long name, with descendants", test: (c) => c.kind === "long" && c.descendants },
  { key: "long-without", title: "Long name, no descendants", test: (c) => c.kind === "long" && !c.descendants },
];

/**
 * Each name box, lifted from the poster as drawn: the poster's own SVG for
 * that person (with the poster's gradients and patterns) in a frame of its
 * own, at the same scale for every design.
 */
function useTiles(svg: SVGSVGElement | null, poster: LabPoster, ids: string[]): Tile[] {
  const [tiles, setTiles] = useState<Tile[]>([]);
  useLayoutEffect(() => {
    if (!svg) return;
    const defs = [...svg.querySelectorAll("defs")].map((d) => d.outerHTML).join("");
    const paper = svg.querySelector("rect")?.getAttribute("fill") ?? "#fff";
    const font = svg.getAttribute("font-family") ?? "serif";
    const mmPerUnit = PAPER_SIZES.A3.w / poster.layout.width;
    const all = [...poster.layout.nodes, ...(poster.layout.base ? [poster.layout.base] : []), ...poster.layout.medallions.map((m) => m as unknown as typeof poster.layout.nodes[number])];
    const nodes = new Map(all.map((n) => [n.id, n]));
    const out: Tile[] = [];
    for (const id of ids) {
      const el = svg.querySelector<SVGGraphicsElement>(`[data-member="${id}"]`);
      const node = nodes.get(id);
      if (!el || !node) continue;
      const ctm = el.getCTM();
      if (!ctm) continue;
      const b = el.getBBox();
      const pts = [[b.x, b.y], [b.x + b.width, b.y], [b.x, b.y + b.height], [b.x + b.width, b.y + b.height]]
        .map(([x, y]) => new DOMPoint(x, y).matrixTransform(ctm));
      const x0 = Math.min(...pts.map((p) => p.x)), x1 = Math.max(...pts.map((p) => p.x));
      const y0 = Math.min(...pts.map((p) => p.y)), y1 = Math.max(...pts.map((p) => p.y));
      const pad = Math.max(x1 - x0, y1 - y0) * 0.12 + 4;
      const clone = el.cloneNode(true) as SVGGraphicsElement;
      clone.removeAttribute("transform");
      clone.removeAttribute("style");
      const m = `matrix(${ctm.a} ${ctm.b} ${ctm.c} ${ctm.d} ${ctm.e} ${ctm.f})`;
      const vb = `${x0 - pad} ${y0 - pad} ${x1 - x0 + 2 * pad} ${y1 - y0 + 2 * pad}`;
      out.push({
        id,
        label: node.label,
        shape: node.shape,
        pt: (node.fontSize * mmPerUnit) / 0.3528,
        w: x1 - x0 + 2 * pad,
        h: y1 - y0 + 2 * pad,
        svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" font-family="${font.replace(/"/g, "'")}" text-rendering="geometricPrecision">`
          + `${defs}<rect x="${x0 - pad}" y="${y0 - pad}" width="${x1 - x0 + 2 * pad}" height="${y1 - y0 + 2 * pad}" fill="${paper}"/>`
          + `<g transform="${m}">${clone.outerHTML}</g></svg>`,
      });
    }
    setTiles(out);
  }, [svg, poster, ids]);
  return tiles;
}

function DesignRow({ poster, language, scale }: { poster: LabPoster; language: LabLanguage; scale: number }) {
  // (screen pixels per poster unit: one for every design, so sizes compare)
  const px = (2400 / poster.layout.width) * scale;
  const [svg, setSvg] = useState<SVGSVGElement | null>(null);
  const ids = useMemo(() => Object.keys(language.cases), [language]);
  const tiles = useTiles(svg, poster, ids);
  const byId = new Map(tiles.map((t) => [t.id, t]));
  const [open, setOpen] = useState(false);
  const meta = { name: language.tree.name, title: language.tree.title, subtitle: language.tree.subtitle };
  return (
    <section className="rounded-lg border border-black/10 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-baseline gap-3">
        <h2 className="text-lg font-semibold text-bark-900" data-design={poster.design}>{poster.label}</h2>
        {poster.current && <span className="rounded-full bg-bark-700 px-2 py-0.5 text-xs text-white">This design&apos;s own</span>}
        {poster.suggested && <span className="rounded-full border border-gilt-500 px-2 py-0.5 text-xs text-gilt-600">Suggested for this design</span>}
        <button type="button" className="text-sm text-bark-500 underline" onClick={() => setOpen((v) => !v)}>
          {open ? "Hide the poster" : "Show the whole poster"}
        </button>
      </div>
      {/* the poster itself (the boxes are lifted from it) */}
      <div className={open ? "mb-4 max-w-3xl" : "pointer-events-none fixed -left-[10000px] top-0 w-[1200px]"} aria-hidden={!open}>
        <TreePoster ref={setSvg} layout={poster.layout} meta={meta} theme={poster.theme} idPrefix={`lab-${language.lang}-${poster.design}`} onSelect={() => {}} className="h-auto w-full" />
      </div>
      <div className="space-y-4">
        {GROUPS.map((g) => {
          const people = ids.filter((id) => g.test(language.cases[id]));
          return (
            <div key={g.key} className="overflow-x-auto">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-bark-500">{g.title}</h3>
              <div className="flex flex-wrap items-end gap-2">
                {people.map((id) => {
                  const t = byId.get(id);
                  if (!t) return null;
                  return (
                    <figure key={id} className="flex flex-col items-center">
                      {/* the poster's own drawing of this person, at one scale for every design */}
                      <div style={{ width: t.w * px, height: t.h * px }} dangerouslySetInnerHTML={{ __html: t.svg.replace("<svg ", `<svg width="${t.w * px}" height="${t.h * px}" `) }} />
                      <figcaption className="mt-1 text-center text-[11px] leading-tight text-bark-500">
                        {t.shape} · {t.pt.toFixed(1)} pt
                      </figcaption>
                    </figure>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function NodeLab({ language, choice, presets }: { language: LabLanguage; choice: LabChoice; presets: { preset: ThemePreset; label: string }[] }) {
  const [scale, setScale] = useState(1);
  const href = (patch: Partial<LabChoice>) => {
    const c = { ...choice, ...patch };
    return `?theme=${c.preset}&lang=${c.lang}${c.years ? "&years=1" : ""}`;
  };
  return (
    <main className="min-h-screen bg-parchment-50 p-6">
      <header className="mb-6 max-w-4xl">
        <h1 className="text-2xl font-semibold text-bark-900">Node Design Lab</h1>
        <p className="mt-1 text-sm text-bark-700">
          The same family in every node design, within the poster design chosen here, laid out by the poster&apos;s layout
          engine and drawn by the poster&apos;s own renderer (A3). Each name is lifted from that poster as drawn: ordinary and
          long names, with descendants (the gold ring) and without. Under each: its design, and the name&apos;s type size on
          the printed A3 poster. A node design is decoration only: it says nothing of a person&apos;s place, status or
          gender. This page changes nothing.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
          <nav aria-label="Poster design" className="flex flex-wrap gap-1">
            {presets.map((p) => (
              <a key={p.preset} href={href({ preset: p.preset })} aria-current={p.preset === choice.preset ? "page" : undefined}
                className={`rounded border px-2.5 py-1 ${p.preset === choice.preset ? "border-bark-700 bg-bark-700 text-white" : "border-black/15 bg-white text-bark-700"}`}>
                {p.label}
              </a>
            ))}
          </nav>
          <nav aria-label="Language" className="inline-flex overflow-hidden rounded border border-black/15">
            {(["ar", "en"] as const).map((l) => (
              <a key={l} href={href({ lang: l })} aria-current={choice.lang === l ? "page" : undefined}
                className={`px-3 py-1 ${choice.lang === l ? "bg-bark-700 text-white" : "bg-white text-bark-700"}`}>
                {l === "ar" ? "Arabic" : "English"}
              </a>
            ))}
          </nav>
          <a href={href({ years: !choice.years })} className="rounded border border-black/15 bg-white px-2.5 py-1 text-bark-700" aria-current={choice.years ? "true" : undefined}>
            {choice.years ? "✓ " : ""}Second line (years)
          </a>
          <label className="flex items-center gap-2 text-bark-700">
            Box size
            <input type="range" min={0.6} max={2} step={0.1} value={scale} onChange={(e) => setScale(Number(e.target.value))} />
          </label>
        </div>
      </header>
      <div className="space-y-6">
        {language.posters.map((p) => <DesignRow key={`${choice.lang}-${choice.preset}-${p.design}-${choice.years}`} poster={p} language={language} scale={scale} />)}
      </div>
    </main>
  );
}
