"use client";

import { useState, type RefObject } from "react";
import { useDismiss } from "../useDismiss";
import {
  PAPER_SIZES, exportPdf, exportPng, exportSvg, exportTiledPdf, maxDpi, pixelSize, tileGrid, type PaperSize,
} from "@/lib/export/exportPoster";
import { SHEET_SIZES, type SheetSize } from "@/lib/paper";

interface Props {
  svgRef: RefObject<SVGSVGElement>;
  filename: string;
  /** The poster size the layout was designed for. */
  defaultPaper?: PaperSize;
  /**
   * Set when the poster's smallest names print below the legible size on
   * the paper it was laid out for (its clean layout needed them smaller).
   */
  smallText?: { smallestMm: number; minMm: number };
}

export type ExportKind = "svg" | "png" | "pdf" | "tiles";

/** The resolution a poster is exported at unless chosen: very large papers lower, as they are seen from further away. */
export const defaultDpi = (paper: PaperSize) => (PAPER_SIZES[paper].w > PAPER_SIZES.A0.w ? 150 : 300);

/** One export of the poster, as the menu's buttons (and the desktop menu bar) make it. */
export async function exportPoster(
  kind: ExportKind, svg: SVGSVGElement, filename: string, paper: PaperSize,
  dpi = defaultDpi(paper), sheet: SheetSize = "A3", onProgress?: (done: number, total: number) => void,
) {
  if (kind === "svg") await exportSvg(svg, filename, paper);
  if (kind === "png") await exportPng(svg, filename, paper, dpi);
  if (kind === "pdf") await exportPdf(svg, filename, paper, dpi);
  if (kind === "tiles") await exportTiledPdf(svg, filename, paper, sheet, dpi, onProgress);
}

export function ExportMenu({ svgRef, filename, defaultPaper = "A2", smallText }: Props) {
  const [open, setOpen] = useState(false);
  const [paper, setPaper] = useState<PaperSize>(defaultPaper);
  // (very large papers default to a lower resolution: they are seen from further away)
  const [dpi, setDpi] = useState(defaultDpi(defaultPaper));
  const [sheet, setSheet] = useState<SheetSize>("A3");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const menu = useDismiss<HTMLDivElement>(open, () => setOpen(false), !!busy);
  // (a PNG or PDF is one browser canvas: very large papers at a lower resolution)
  const rasterDpi = Math.min(dpi, maxDpi(paper));
  const px = pixelSize(paper, rasterDpi);
  const tiles = tileGrid(paper, sheet);
  // (text scales with the paper chosen here)
  const printedMm = smallText ? (smallText.smallestMm * PAPER_SIZES[paper].w) / PAPER_SIZES[defaultPaper].w : null;

  const run = async (kind: ExportKind) => {
    const svg = svgRef.current;
    if (!svg) return;
    setBusy(kind);
    setError(null);
    try {
      await exportPoster(kind, svg, filename, paper, dpi, sheet, (done, total) => setProgress({ done, total }));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
      setProgress(null);
    }
  };

  return (
    <div className="relative" ref={menu}>
      <button type="button" className="btn-primary whitespace-nowrap" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        Export for print ▾
      </button>
      {open && (
        <div className="absolute end-0 z-30 mt-2 w-96 space-y-3 rounded-lg border border-parchment-300 bg-white p-4 shadow-xl">
          <div className="grid grid-cols-[1fr_7rem] gap-2">
            <label className="text-xs font-medium text-bark-700">
              Paper
              <select className="input mt-1" value={paper} onChange={(e) => setPaper(e.target.value as PaperSize)}>
                {Object.entries(PAPER_SIZES).map(([k, v]) => (
                  <option key={k} value={k}>{k} — {v.w}×{v.h} mm</option>
                ))}
              </select>
            </label>
            <label className="text-xs font-medium text-bark-700">
              Resolution
              <select className="input mt-1" value={dpi} onChange={(e) => setDpi(Number(e.target.value))}>
                {[150, 200, 300].map((d) => <option key={d} value={d}>{d} DPI</option>)}
              </select>
            </label>
          </div>
          <p className="text-xs text-gray-500">
            Raster output: {px.width.toLocaleString()} × {px.height.toLocaleString()} px
            {rasterDpi < dpi && ` (${rasterDpi} DPI: the most one image can hold at ${paper}; a Tiled PDF keeps ${dpi} DPI)`}
            {paper !== defaultPaper && ` · the layout was designed for ${defaultPaper}; text scales with the paper`}
          </p>
          {printedMm !== null && smallText && printedMm < smallText.minMm && (
            <p role="note" className="rounded border border-amber-300 bg-amber-50 px-2 py-1.5 text-xs text-amber-900">
              On {paper} the smallest names print at {printedMm.toFixed(1)} mm, below the {smallText.minMm.toFixed(1)} mm that reads
              comfortably. A larger paper, or a poster of one branch, keeps every name readable.
            </p>
          )}
          <div className="grid gap-2">
            <button type="button" className="btn-outline justify-between" disabled={!!busy} onClick={() => run("svg")}>
              <span>Vector SVG</span><span className="text-xs text-gray-500">{busy === "svg" ? "Working…" : "infinite resolution"}</span>
            </button>
            <button type="button" className="btn-outline justify-between" disabled={!!busy} onClick={() => run("pdf")}>
              <span>Print PDF</span><span className="text-xs text-gray-500">{busy === "pdf" ? "Rendering…" : `${paper} @ ${rasterDpi} DPI`}</span>
            </button>
            <button type="button" className="btn-outline justify-between" disabled={!!busy} onClick={() => run("png")}>
              <span>PNG image</span><span className="text-xs text-gray-500">{busy === "png" ? "Rendering…" : `${paper} @ ${rasterDpi} DPI`}</span>
            </button>
          </div>
          <div className="flex items-center gap-2 border-t border-parchment-200 pt-3">
            <button type="button" className="btn-outline flex-1 justify-between" disabled={!!busy} onClick={() => run("tiles")}>
              <span className="whitespace-nowrap">Tiled PDF</span><span className="text-xs text-gray-500">{busy === "tiles" ? (progress ? `Sheet ${Math.min(progress.done + 1, progress.total)} of ${progress.total}…` : "Rendering…") : `${paper} on ${(tiles.rows * tiles.cols).toLocaleString()} ${sheet} sheets`}</span>
            </button>
            <select className="input w-20" value={sheet} onChange={(e) => setSheet(e.target.value as SheetSize)} aria-label="Sheet size">
              {Object.keys(SHEET_SIZES).map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
          {error && <p className="text-sm text-red-700">{error}</p>}
        </div>
      )}
    </div>
  );
}
