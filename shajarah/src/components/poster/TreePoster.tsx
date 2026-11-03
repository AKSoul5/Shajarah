"use client";

import { forwardRef, memo, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode, type SVGProps } from "react";
import type { PosterLayout, PosterNode, SpouseHolder } from "@/lib/layout/botanical";
import { soilStyle, type SoilContext, type SoilInk, type SoilStyleId } from "@/lib/layout/soil";
import { textWidth } from "@/lib/layout/botanical";
import { LEAF_TONES, generationColor, generationLabel } from "@/lib/layout/palette";
import { hashString } from "@/lib/layout/random";
import { lineageColor, paletteOf, rimOn, satinStops, shade, textOn, type PosterPalette } from "@/lib/theme";
import { HADITH, VERSE, scallopPath, textInCircle } from "./ornaments";
import { DesignFrame, TitleGround, TitleRule, soilOrnament } from "./frames";
import type { PosterTheme } from "@/lib/types";
import { LEGEND, NAMED_GENERATIONS, say, spouseLabel, statCards } from "@/lib/legend";

export interface PosterMeta {
  title: string | null;
  subtitle: string | null;
  name: string;
  /** When the family was last changed (ISO time): the footer's "last updated". */
  updated?: string | null;
}

interface Props {
  layout: PosterLayout;
  meta: PosterMeta;
  theme: PosterTheme;
  selectedId?: string | null;
  /**
   * The selected person's direct line (ancestors and descendants). When set,
   * the rest of the poster is dimmed and this line is traced on top.
   */
  lineageIds?: Set<string>;
  /** Mark the spots the relationship-clarity check flagged (editor only). */
  showIssues?: boolean;
  onSelect?: (memberId: string) => void;
  /** A name right-clicked (editor only): its menu opens at the pointer. */
  onMenu?: (memberId: string, clientX: number, clientY: number) => void;
  /** Names found by the poster's search, ringed in gold; `currentMarkId` the one shown now (editor only). */
  markedIds?: Set<string>;
  currentMarkId?: string | null;
  /**
   * Names dragged among their brothers and sisters (editor only): dropped on
   * a sibling, a name takes that sibling's place in the birth order.
   * `siblingsOf` gives a person and their siblings, eldest first.
   */
  reorder?: { siblingsOf: (id: string) => string[]; onMove: (id: string, position: number) => void };
  className?: string;
  /**
   * URL of the frame artwork (gold-foil border, corner arabesques and
   * parchment texture, designed in Canva). Drawn full-bleed behind the
   * tree when the theme's frame is on; otherwise a fine gold rule frames
   * plain ivory paper.
   */
  frameSrc?: string | null;
  /** The prefix of the poster's gradient and pattern ids: unique per poster on a page (the design previews). */
  idPrefix?: string;
}

const FONT = "Amiri, 'Traditional Arabic', 'Noto Naskh Arabic', 'Times New Roman', serif";
/** Calligraphic face for headings. */
const RUQAA = "'Aref Ruqaa', Amiri, 'Traditional Arabic', serif";
/** Geometric Kufi for the titles of the modern designs (Platinum, Modern Archive). */
const KUFI = "'Noto Kufi Arabic', Amiri, 'Traditional Arabic', sans-serif";
// The editor's own marks (dragging a name) keep fixed colours; the poster
// itself is drawn only in its theme's palette (see paletteOf).
const PAPER = "#f7f1e3";
const GOLD = "#b08a2e";
const INK = "#2a1c0c";

interface Palette extends PosterPalette {
  /** The prefix of this poster's gradient and pattern ids (several posters can share a page). */
  uid: string;
  mono: boolean;
  ink: string;
  /** Fine gold lines (rules, rims). */
  line: string;
  /** Fill, border and text colour of a name. */
  fill: (n: PosterNode) => { fill: string; border: string; text: string };
  /** Colour of a lineage's branches (bark when branch colours are off). */
  branch: (lineage: number | null | undefined) => string;
  /** Rim colour carrying the lineage, or null to keep the role's own rim. */
  rim: (lineage: number | null | undefined) => string | null;
}

function makePalette(theme: PosterTheme, layout: PosterLayout, uid = "sh"): Palette {
  const tokens = paletteOf(theme);
  const mono = tokens.inkOnly;
  const satin = (gender: string) => (gender === "FEMALE" ? `url(#${uid}-satin-f)` : `url(#${uid}-satin-m)`);
  const coloured = theme.branchColors && !mono;
  const bark = mono ? "#1a1a1a" : theme.branch;
  // how many main branches the poster has (the seventh and eighth colours
  // only for one with that many; see lineageColor)
  // (a preview's stub layout has no names: the default count)
  const count = 1 + (layout.nodes ?? []).reduce((m, n) => Math.max(m, n.lineage ?? -1), -1);
  return {
    ...tokens,
    uid,
    mono,
    branch: (i) => (coloured ? lineageColor(i, bark, tokens.lineage, count) : bark),
    rim: (i) => (coloured && i != null ? lineageColor(i, bark, tokens.lineage, count) : null),
    line: tokens.rule,
    fill: (n) => {
      if (mono) return { fill: "#ffffff", border: "#111111", text: "#111111" };
      const female = n.member.gender === "FEMALE";
      if (theme.colorBy === "generation") {
        const c = generationColor(n.generation - layout.generationOffset);
        return { fill: c.fill, border: shade(c.fill, -0.35), text: c.text };
      }
      // A parent keeps the son's or daughter's colour (who they are stays
      // readable); having descendants is shown by a second, gold ring and
      // bold type (see PersonNode). Only the line of fathers on the trunk
      // is ivory.
      if (theme.preset === "classic" && !female && n.shape === "leaf") {
        const tone = LEAF_TONES[hashString(n.id) % LEAF_TONES.length];
        return { fill: tone, border: shade(tone, -0.4), text: "#ffffff" };
      }
      const base = female ? theme.female : theme.male;
      return { fill: theme.metallic ? satin(n.member.gender) : base, border: rimOn(base, tokens.paper), text: textOn(base) };
    },
  };
}

/** A restrained satin finish: a soft vertical sheen, no gloss. */
function SatinGradient({ id, color }: { id: string; color: string }) {
  const [hi, body, lo] = satinStops(color);
  return (
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor={hi} />
      <stop offset="0.55" stopColor={body} />
      <stop offset="1" stopColor={lo} />
    </linearGradient>
  );
}

/**
 * Pure SVG renderer for a computed PosterLayout and theme. The same element
 * is serialised for SVG / PNG / PDF export; editor-only marks (selection,
 * ancestor highlight) live in a `data-ui` layer that export removes.
 */
export const TreePoster = memo(
  forwardRef<SVGSVGElement, Props>(function TreePoster(
    { layout, meta, theme, selectedId, lineageIds, showIssues, onSelect, onMenu, markedIds, currentMarkId, reorder, className, frameSrc, idPrefix = "sh" },
    ref,
  ) {
    const { width: W, height: H, rtl } = layout;
    const pal = makePalette(theme, layout, idPrefix);
    const bark = pal.mono ? "#1a1a1a" : theme.branch;
    // (a design that rims its names in its metal, Imperial Gold's gold,
    // Platinum's steel, Emerald Dynasty's brass, keeps the branch colours on
    // the branches; the others rim each name in its branch's colour)
    const metalRim = !pal.mono && (pal.rimStyle === "metal" || pal.rimStyle === "gold");
    const withRim = (n: PosterNode) => {
      const f = pal.fill(n);
      if (metalRim && theme.colorBy !== "generation") return { ...f, border: pal.rimStyle === "gold" ? pal.ornament : pal.rule };
      const rim = pal.rim(n.lineage);
      return rim ? { ...f, border: rim } : f;
    };
    // the gold-foil artwork is Imperial Gold's frame; every other design draws its own
    const artwork = theme.frame && pal.frame === "foil" && !!frameSrc && !pal.mono;
    const frameKind = pal.mono ? "hairline" : theme.frame ? pal.frame : "rule";
    const click = (id: string) => (onSelect ? {
      onClick: () => onSelect(id), style: { cursor: "pointer" }, "data-member": id,
      ...(onMenu ? { onContextMenu: (e: { preventDefault: () => void; clientX: number; clientY: number }) => { e.preventDefault(); onMenu(id, e.clientX, e.clientY); } } : {}),
    } : {});
    const tracing = !!selectedId && !!lineageIds && lineageIds.size > 0;
    const onLine = (id: string) => id === selectedId || !!lineageIds?.has(id);

    return (
      <svg
        ref={ref}
        xmlns="http://www.w3.org/2000/svg"
        viewBox={`0 0 ${W} ${H}`}
        className={className}
        fontFamily={FONT}
        textRendering="geometricPrecision"
        role="img"
        aria-label={meta.title ?? meta.name}
      >
        <defs>
          <SatinGradient id={`${pal.uid}-satin-m`} color={theme.male} />
          <SatinGradient id={`${pal.uid}-satin-f`} color={theme.female} />
          <TrunkGradient id={`${pal.uid}-trunk`} bark={bark} d={layout.trunkPath} />
          <linearGradient id={`${pal.uid}-gold-text`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={pal.titleHi} />
            <stop offset="1" stopColor={pal.titleLo} />
          </linearGradient>
        </defs>

        {/* Paper (with its grain, in the designs that have one), then the frame */}
        <rect width={W} height={H} fill={pal.paper} />
        {pal.texture === "grain" && !artwork && <PaperGrain W={W} H={H} colour={pal.inkSoft} uid={pal.uid} />}
        {artwork ? (
          // (softer: the paper shows through the gold and its texture)
          <image href={frameSrc!} x={0} y={0} width={W} height={H} preserveAspectRatio="none" opacity={theme.frameFinish === "soft" ? 0.6 : 1} />
        ) : (
          <DesignFrame W={W} H={H} pal={pal} kind={frameKind === "foil" ? "rule" : frameKind} accent={theme.male} />
        )}

        <Header layout={layout} meta={meta} theme={theme} pal={pal} />
        {layout.medallions.map((m, i) => {
          // RTL: the verse sits on the right, the hadith on the left
          const isVerse = (m.x > W / 2) === rtl;
          const show = isVerse ? theme.verse : theme.hadith;
          return show ? <TextMedallion key={i} {...m} content={isVerse ? VERSE : HADITH} pal={pal} /> : null;
        })}

        {/* A faint wash behind the canopy gives a sparse tree its shape */}
        {layout.canopy && pal.canopyWashOpacity > 0 && <path d={layout.canopy} fill={pal.canopyWash} opacity={pal.canopyWashOpacity} />}
        {theme.branchTint && theme.branchColors && !pal.mono && <BranchTints layout={layout} pal={pal} />}

        {/* Ground and roots */}
        {layout.soil ? (
          <g>
            {layout.soil.ground && <path d={layout.soil.ground} fill="none" stroke={bark} strokeWidth={W * 0.0012} strokeLinecap="round" opacity={0.7} />}
            <g fill={bark} opacity={0.75}>{layout.soil.roots.map((d, i) => <path key={i} d={d} />)}</g>
          </g>
        ) : (
          <g>
            <path
              d={`M${W * 0.3} ${layout.groundY + W * 0.006}Q${W / 2} ${layout.groundY - W * 0.006} ${W * 0.7} ${layout.groundY + W * 0.006}`}
              fill="none" stroke={bark} strokeWidth={W * 0.0012} strokeLinecap="round" opacity={0.6}
            />
            <g fill={bark}>{layout.surfaceRoots.map((r, i) => <path key={i} d={r.d} />)}</g>
          </g>
        )}

        {/* Trunk and branches: clean tapered vector shapes, no textures */}
        <path d={layout.trunkPath} fill={pal.mono ? "#ffffff" : `url(#${pal.uid}-trunk)`} stroke={pal.mono ? "#111" : "none"} strokeWidth={W * 0.0015} />
        {/* Every branch has a fine paper-coloured edge, so where lines cross
            the upper one visibly passes over the lower (never a shared junction) */}
        <g stroke={pal.paper} strokeWidth={W * 0.0018} strokeLinejoin="round" paintOrder="stroke">
          {layout.branches.map((b, i) =>
            b.dotted ? (
              // a family shown through a daughter: round dots along the line,
              // evenly from one end to the other (spaced to fit its length)
              b.length ? (
                <path key={i} d={b.d} fill="none" stroke={pal.branch(b.lineage)} strokeWidth={b.w} strokeLinecap="round"
                  pathLength={Math.max(1, Math.round(b.length / (b.w * 2.4)))} strokeDasharray="0.001 0.999" strokeDashoffset={-(b.phase ?? 0)} opacity={0.9} />
              ) : (
                <path key={i} d={b.d} fill="none" stroke={pal.branch(b.lineage)} strokeWidth={b.w} strokeLinecap="round" strokeDasharray={`0.01 ${(b.w * 2.4).toFixed(1)}`} opacity={0.9} />
              )
            ) : (
              <path key={i} d={b.d} fill={pal.branch(b.lineage)} />
            ),
          )}
        </g>

        {/* The ancestral chain on the trunk, eldest at the bottom, joined by a gold
            thread that runs up the middle of the bark to the canopy base */}
        {layout.trunkLabels.length > 0 && (
          <polyline
            points={[...layout.trunkLabels, layout.origin].map((l) => `${l.x.toFixed(1)},${l.y.toFixed(1)}`).join(" ")}
            fill="none" stroke={pal.thread} strokeWidth={layout.trunkLabels[0].fontSize * 0.12} strokeLinejoin="round"
          />
        )}
        {layout.trunkLabels.map((l) => <TrunkBadge key={l.member.id} label={l} pal={pal} onClick={click(l.member.id)} />)}

        {/* Spouses on the branches */}
        {layout.spouses.map((s) => <Cartouche key={s.id} holder={s} pal={pal} style={theme.spouseStyle ?? "manuscript"} onClick={click(s.member.id)} />)}

        {/* People */}
        {layout.stubs.map((n) => (
          <Medallion key={n.id} node={n} pal={pal} onClick={click(n.id)} />
        ))}
        {layout.nodes.map((n) =>
          n.shape === "medallion" ? (
            <Medallion key={n.id} node={n} pal={pal} onClick={click(n.id)} ring={pal.rim(n.lineage)} />
          ) : (
            <PersonNode key={n.id} node={n} {...withRim(n)} pal={pal} onClick={click(n.id)} detail={pal.mono || theme.colorBy === "generation" ? null : pal.rimStyle} />
          ),
        )}
        {layout.base && <Medallion node={layout.base} pal={pal} onClick={click(layout.base.id)} strong />}

        {/* Foundation: the ancient lineage */}
        {layout.soil && <Foundation layout={layout} pal={pal} bark={bark} click={click} />}

        <Footer layout={layout} theme={theme} pal={pal} meta={meta} />

        {/* Editor-only marks: removed from every export */}
        {tracing && (
          <LineageTrace layout={layout} pal={pal} ids={lineageIds!} selectedId={selectedId!} W={W} H={H} click={click} />
        )}
        {!tracing && selectedId && (
          <g data-ui="selection" fill="none" pointerEvents="none">
            {[...layout.nodes, ...layout.stubs, ...(layout.base ? [layout.base] : [])]
              .filter((n) => onLine(n.id))
              .map((n) => (
                <rect key={n.id} x={n.x - n.w / 2 - n.fontSize * 0.3} y={n.y - n.h / 2 - n.fontSize * 0.3}
                  width={n.w + n.fontSize * 0.6} height={n.h + n.fontSize * 0.6} rx={n.fontSize * 0.6}
                  stroke="#c62828" strokeWidth={n.fontSize * 0.18} />
              ))}
          </g>
        )}
        {markedIds && markedIds.size > 0 && (
          // names the search found: a gold ring each, the one shown now bolder
          <g data-ui="find" fill="none" pointerEvents="none">
            {[...layout.nodes, ...layout.stubs, ...(layout.base ? [layout.base] : [])]
              .filter((n) => markedIds.has(n.id))
              .map((n) => (
                <rect key={n.id} x={n.x - n.w / 2 - n.fontSize * 0.45} y={n.y - n.h / 2 - n.fontSize * 0.45}
                  width={n.w + n.fontSize * 0.9} height={n.h + n.fontSize * 0.9} rx={n.fontSize * 0.75}
                  stroke="#c39a3c" strokeWidth={n.fontSize * (n.id === currentMarkId ? 0.32 : 0.16)} />
              ))}
            {layout.trunkLabels.filter((l) => markedIds.has(l.member.id)).map((l) => (
              <rect key={l.member.id} x={l.x - l.w / 2 - l.fontSize * 0.3} y={l.y - l.h / 2 - l.fontSize * 0.3}
                width={l.w + l.fontSize * 0.6} height={l.h + l.fontSize * 0.6} rx={l.fontSize * 0.5}
                stroke="#c39a3c" strokeWidth={l.fontSize * (l.member.id === currentMarkId ? 0.3 : 0.15)} />
            ))}
          </g>
        )}
        {reorder && <ReorderLayer layout={layout} reorder={reorder} />}
        {showIssues && !layout.clarity.ok && !layout.tooDense && (
          <g data-ui="clarity" fill="none" stroke="#d32f2f" pointerEvents="none">
            {layout.clarity.issues.filter((i) => i.at).map((i, k) => (
              <circle key={k} cx={i.at!.x} cy={i.at!.y} r={W * 0.012} strokeWidth={W * 0.0025} strokeDasharray={`${W * 0.004} ${W * 0.003}`} />
            ))}
          </g>
        )}
      </svg>
    );
  }),
);

/**
 * Dragging a name onto one of its brothers or sisters: while dragging, the
 * siblings are ringed, the one it would take the place of more strongly, and
 * the name follows the pointer. A short press is still a click (select);
 * dragging anywhere else still pans the poster.
 */
function ReorderLayer({ layout, reorder }: { layout: PosterLayout; reorder: NonNullable<Props["reorder"]> }) {
  const layer = useRef<SVGGElement>(null);
  const boxes = useMemo(() => new Map([...layout.nodes, ...layout.stubs].map((n) => [n.id, n])), [layout]);
  const [drag, setDrag] = useState<{ id: string; x: number; y: number; target: string | null; siblings: string[] } | null>(null);

  useEffect(() => {
    const svg = layer.current?.ownerSVGElement;
    if (!svg) return;
    let start: { id: string; x: number; y: number; siblings: string[] } | null = null;
    let active: { target: string | null } | null = null;
    let swallowClick = false;
    // a name with brothers or sisters on the poster can be dragged
    const draggable = (e: Event) => {
      const id = (e.target as Element | null)?.closest?.("[data-member]")?.getAttribute("data-member");
      if (!id || !boxes.has(id)) return null;
      const siblings = reorder.siblingsOf(id);
      return siblings.some((s) => s !== id && boxes.has(s)) ? { id, siblings } : null;
    };
    const toPoster = (e: PointerEvent) => {
      const m = svg.getScreenCTM();
      return m ? new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse()) : null;
    };
    // (the viewport pans on mousedown / touchstart: not when it starts on a draggable name)
    const hold = (e: Event) => {
      if (!draggable(e)) return;
      e.stopPropagation();
      if (e.type === "mousedown") e.preventDefault(); // (no text selection while dragging)
    };
    const down = (e: PointerEvent) => {
      swallowClick = false;
      if (e.button !== 0) return;
      const d = draggable(e);
      start = d && { ...d, x: e.clientX, y: e.clientY };
    };
    const move = (e: PointerEvent) => {
      if (!start) return;
      if (!active && Math.hypot(e.clientX - start.x, e.clientY - start.y) < 6) return;
      active ??= { target: null };
      const p = toPoster(e);
      if (!p) return;
      // the sibling nearest the pointer, within reach of its name
      let target: string | null = null;
      let best = Infinity;
      for (const s of start.siblings) {
        const b = boxes.get(s);
        if (!b || s === start.id) continue;
        const dist = Math.hypot(p.x - b.x, p.y - b.y);
        if (dist < Math.max(b.w, b.h) * 0.75 + b.fontSize && dist < best) { best = dist; target = s; }
      }
      active.target = target;
      setDrag({ id: start.id, x: p.x, y: p.y, target, siblings: start.siblings });
    };
    const up = () => {
      if (start && active) {
        swallowClick = true;
        if (active.target) reorder.onMove(start.id, start.siblings.indexOf(active.target));
      }
      start = null;
      active = null;
      setDrag(null);
    };
    const click = (e: MouseEvent) => {
      if (!swallowClick) return;
      swallowClick = false;
      e.stopPropagation();
    };
    svg.addEventListener("mousedown", hold);
    svg.addEventListener("touchstart", hold);
    svg.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    svg.addEventListener("click", click, true);
    return () => {
      svg.removeEventListener("mousedown", hold);
      svg.removeEventListener("touchstart", hold);
      svg.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      svg.removeEventListener("click", click, true);
    };
  }, [boxes, reorder]);

  const me = drag && boxes.get(drag.id);
  return (
    <g ref={layer} data-ui="reorder" pointerEvents="none">
      {drag && me && (
        <>
          {drag.siblings.filter((s) => s !== drag.id).map((s) => boxes.get(s)).filter((b): b is PosterNode => !!b).map((b) => {
            const on = b.id === drag.target;
            const pad = b.fontSize * (on ? 0.45 : 0.3);
            return (
              <rect key={b.id} x={b.x - b.w / 2 - pad} y={b.y - b.h / 2 - pad} width={b.w + 2 * pad} height={b.h + 2 * pad} rx={b.fontSize * 0.6}
                fill={on ? "#b08a2e22" : "none"} stroke={GOLD} strokeWidth={b.fontSize * (on ? 0.22 : 0.1)}
                strokeDasharray={on ? undefined : `${b.fontSize * 0.4} ${b.fontSize * 0.3}`} />
            );
          })}
          <rect x={me.x - me.w / 2} y={me.y - me.h / 2} width={me.w} height={me.h} rx={me.fontSize * 0.5} fill={PAPER} opacity={0.7} />
          <text x={drag.x} y={drag.y} fontSize={me.fontSize} textAnchor="middle" dominantBaseline="central" fill={INK} opacity={0.85}
            stroke={PAPER} strokeWidth={me.fontSize * 0.25} paintOrder="stroke">
            {me.label}
          </text>
        </>
      )}
    </g>
  );
}

function TrunkBadge({ label: l, pal, onClick }: { label: PosterLayout["trunkLabels"][number]; pal: Palette; onClick: object }) {
  return (
    <g {...onClick}>
      <title>{l.label}</title>
      <rect x={l.x - l.w / 2} y={l.y - l.h / 2} width={l.w} height={l.h} rx={l.h / 2}
        fill={pal.ivory} stroke={pal.line} strokeWidth={l.fontSize * 0.07} />
      <text x={l.x} y={l.y} textAnchor="middle" dominantBaseline="central" fontSize={l.fontSize} fontWeight={700} fill={pal.ink}>
        {l.label}
      </text>
    </g>
  );
}

/**
 * Traces one person's direct line: the rest of the poster is veiled, and
 * every connection between two people on the line (from the data, not from
 * proximity) is drawn on top in a strong colour, with those people's labels.
 * Editor only (data-ui): never exported.
 */
function LineageTrace({ layout, pal, ids, selectedId, W, H, click }: {
  layout: PosterLayout; pal: Palette; ids: Set<string>; selectedId: string; W: number; H: number;
  click: (id: string) => object;
}) {
  const on = (id: string) => id === selectedId || ids.has(id);
  const TRACE = "#b3261e";
  const edges = layout.edges.filter((e) => on(e.parentId) && on(e.childId));
  const trunk = layout.trunkLabels.filter((l) => on(l.member.id));
  // trunk thread: consecutive ancestors on the line, then up to the crown base
  const chain = [...trunk.map((l) => ({ x: l.x, y: l.y })), ...(layout.base && on(layout.base.id) ? [{ x: layout.base.x, y: layout.base.y }] : [])];
  const people = [...layout.nodes, ...layout.stubs, ...(layout.base ? [layout.base] : [])].filter((n) => on(n.id));
  const f = (n: number) => n.toFixed(1);
  return (
    <g data-ui="lineage">
      <rect width={W} height={H} fill={pal.paper} opacity={0.72} pointerEvents="none" />
      <g fill="none" stroke={TRACE} strokeLinecap="round" strokeLinejoin="round" pointerEvents="none">
        {edges.map((e) => (
          <polyline key={`${e.parentId}-${e.childId}`} points={e.points.map((p) => `${f(p.x)},${f(p.y)}`).join(" ")}
            strokeWidth={Math.max(W * 0.003, e.w0 * 0.9)} />
        ))}
        {chain.length > 1 && <polyline points={chain.map((p) => `${f(p.x)},${f(p.y)}`).join(" ")} strokeWidth={W * 0.003} />}
      </g>
      {trunk.map((l) => <TrunkBadge key={l.member.id} label={l} pal={pal} onClick={click(l.member.id)} />)}
      {people.map((n) =>
        n.shape === "medallion" ? (
          <Medallion key={n.id} node={n} pal={pal} onClick={click(n.id)} strong={n.id === layout.base?.id} ring={n.id === layout.base?.id ? null : pal.rim(n.lineage)} />
        ) : (
          <PersonNode key={n.id} node={n} {...pal.fill(n)} border={pal.rim(n.lineage) ?? pal.fill(n).border} pal={pal} onClick={click(n.id)} />
        ),
      )}
      {people.filter((n) => n.id === selectedId).map((n) => (
        <rect key="sel" x={n.x - n.w / 2 - n.fontSize * 0.35} y={n.y - n.h / 2 - n.fontSize * 0.35}
          width={n.w + n.fontSize * 0.7} height={n.h + n.fontSize * 0.7} rx={n.fontSize * 0.6}
          fill="none" stroke={TRACE} strokeWidth={n.fontSize * 0.18} pointerEvents="none" />
      ))}
      {trunk.filter((l) => l.member.id === selectedId).map((l) => (
        <rect key="sel-t" x={l.x - l.w / 2 - l.fontSize * 0.3} y={l.y - l.h / 2 - l.fontSize * 0.3}
          width={l.w + l.fontSize * 0.6} height={l.h + l.fontSize * 0.6} rx={l.h / 2}
          fill="none" stroke={TRACE} strokeWidth={l.fontSize * 0.15} pointerEvents="none" />
      ))}
    </g>
  );
}

/** Leaf blade centred on the origin, pointing along +x: round base, pointed tip. */
function leafPath(L: number, w: number): string {
  const f = (n: number) => n.toFixed(2);
  return `M${f(-L / 2)} 0C${f(-L * 0.22)} ${f(-w * 0.78)} ${f(L * 0.28)} ${f(-w * 0.62)} ${f(L / 2)} 0`
    + `C${f(L * 0.28)} ${f(w * 0.62)} ${f(-L * 0.22)} ${f(w * 0.78)} ${f(-L / 2)} 0Z`;
}

/**
 * A fine grain in the paper, as of laid and aged sheets: short fibres in a
 * tile (the same every time), in the faintest ink.
 */
function PaperGrain({ W, H, colour, uid }: { W: number; H: number; colour: string; uid: string }) {
  const t = W * 0.06;
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const fibres: string[] = [];
  for (let i = 0; i < 46; i++) {
    const x = rnd() * t, y = rnd() * t, a = rnd() * Math.PI, l = t * (0.04 + rnd() * 0.09);
    fibres.push(`M${x.toFixed(1)} ${y.toFixed(1)}l${(Math.cos(a) * l).toFixed(1)} ${(Math.sin(a) * l).toFixed(1)}`);
  }
  return (
    <>
      <defs>
        <pattern id={`${uid}-grain`} width={t} height={t} patternUnits="userSpaceOnUse">
          <path d={fibres.join("")} stroke={colour} strokeWidth={W * 0.0004} strokeLinecap="round" />
        </pattern>
      </defs>
      <rect width={W} height={H} fill={`url(#${uid}-grain)`} opacity={0.1} />
    </>
  );
}

/** Ivory disc with a fine double gold ring: branch heads, the crown base, stubs. */
/** A round medallion (branch heads), or an oval one (the canopy base) when wider than tall. */
function Medallion({ node, pal, onClick, strong, ring }: { node: PosterNode; pal: Palette; onClick: object; strong?: boolean; ring?: string | null }) {
  const rx = node.w / 2, ry = node.h / 2;
  const fs = node.fontSize;
  const inset = fs * 0.22;
  // a daughter heading a branch keeps her colour (sons' medallions are ivory)
  const own = !strong && node.member.gender === "FEMALE" ? pal.fill(node) : null;
  return (
    <g transform={`translate(${node.x.toFixed(1)} ${node.y.toFixed(1)})`} {...onClick}>
      <title>{node.label}</title>
      {pal.mono ? (
        <ellipse rx={rx} ry={ry} fill="#fff" stroke="#111" strokeWidth={fs * 0.09} />
      ) : (
        <>
          {strong && <path d={scallopPath(0, 0, rx + ry * 0.07, ry * 1.07, 28, 0.025)} fill="none" stroke={pal.ornament} strokeWidth={fs * 0.05} />}
          <ellipse rx={rx} ry={ry} fill={own?.fill ?? pal.ivory} stroke={ring ?? pal.ornament} strokeWidth={fs * (ring ? 0.12 : 0.09)} />
          <ellipse rx={rx - inset} ry={ry - inset} fill="none" stroke={pal.ornament} strokeWidth={fs * 0.03} />
        </>
      )}
      <text y={nameY(node)} textAnchor="middle" dominantBaseline="central" fontSize={fs} fontWeight={700} fill={own && !pal.mono ? own.text : pal.ink}>
        {node.label}
      </text>
      <SubLines node={node} y={fs * 0.6} fontSize={fs * 0.68} fill={own && !pal.mono ? own.text : pal.ink} opacity={0.8} />
    </g>
  );
}

/**
 * A cartouche: a name panel with its corners cut in as quarter circles,
 * the classic frame of a name in a manuscript; centred on 0, 0.
 */
/**
 * A manuscript cartouche: a panel whose ends draw to a point in a gentle
 * convex curve, as name panels are drawn in manuscripts (never notched
 * inward, which reads as a ticket).
 */
function manuscriptPath(w: number, h: number, tip: number): string {
  const x = w / 2, y = h / 2, b = x - tip;
  const f = (v: number) => v.toFixed(1);
  return `M${f(-x)} 0Q${f(-x + tip * 0.3)} ${f(-y)} ${f(-b)} ${f(-y)}H${f(b)}Q${f(x - tip * 0.3)} ${f(-y)} ${f(x)} 0`
    + `Q${f(x - tip * 0.3)} ${f(y)} ${f(b)} ${f(y)}H${f(-b)}Q${f(-x + tip * 0.3)} ${f(y)} ${f(-x)} 0Z`;
}

const lozengePath = (x: number, y: number, s: number) =>
  `M${(x - s).toFixed(1)} ${y.toFixed(1)}L${x.toFixed(1)} ${(y - s * 1.3).toFixed(1)}L${(x + s).toFixed(1)} ${y.toFixed(1)}L${x.toFixed(1)} ${(y + s * 1.3).toFixed(1)}Z`;


/**
 * The frame of a spouse's name, in one of three designs (theme.spouseStyle),
 * centred on 0, 0: drawn on the branches and, smaller, in the key, so the
 * key's spouse is the poster's spouse. A daughter's husband (a family shown
 * through her) has a dashed rule. Every design carries a cue that is not
 * colour (pointed ends, a lozenge at each end, or a ruled inscription with
 * no box), so a spouse is never told from a person by colour alone.
 */
export function SpouseFrame({ style, w, h, fs, pal, dotted }: { style: PosterTheme["spouseStyle"]; w: number; h: number; fs: number; pal: Palette; dotted: boolean }) {
  const dash = dotted ? `${(fs * 0.25).toFixed(1)} ${(fs * 0.18).toFixed(1)}` : undefined;
  const rule = pal.rule;
  if (style === "capsule") {
    const mark = h * 0.42;
    return (
      <g data-spouse-frame="capsule">
        <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={h / 2} fill={pal.spouseFill} stroke={pal.spouseRim} strokeWidth={fs * 0.05} strokeDasharray={dash} />
        <path d={lozengePath(-w / 2 + mark, 0, fs * 0.09) + lozengePath(w / 2 - mark, 0, fs * 0.09)} fill={pal.mono ? rule : pal.spouseRim} opacity={0.85} />
      </g>
    );
  }
  if (style === "inscribed") {
    // no box: a soft paper ground keeps the name clear of branches, a fine gold rule with a lozenge under it
    const y = h / 2 - fs * 0.22, half = w / 2 - fs * 0.45;
    return (
      <g data-spouse-frame="inscribed">
        <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={fs * 0.5} fill={pal.paper} />
        <path d={`M${(-half).toFixed(1)} ${y.toFixed(1)}H${(-fs * 0.3).toFixed(1)}M${(fs * 0.3).toFixed(1)} ${y.toFixed(1)}H${half.toFixed(1)}`} stroke={rule} strokeWidth={fs * 0.045} strokeDasharray={dash} strokeLinecap="round" />
        <path d={lozengePath(0, y, fs * 0.13)} fill={rule} />
      </g>
    );
  }
  const tip = Math.min(fs * 0.85, h * 0.55);
  return (
    <g data-spouse-frame="manuscript">
      <path d={manuscriptPath(w, h, tip)} fill={pal.ivory} stroke={rule} strokeWidth={fs * 0.06} strokeDasharray={dash} />
      {!pal.mono && <path d={lozengePath(-w / 2 + tip * 0.42, 0, fs * 0.09) + lozengePath(w / 2 - tip * 0.42, 0, fs * 0.09)} fill={pal.spouseRim} opacity={0.8} />}
    </g>
  );
}

/**
 * A spouse's name on the branch: its frame (SpouseFrame) and the name.
 */
function Cartouche({ holder: s, pal, style, onClick }: { holder: SpouseHolder; pal: Palette; style: PosterTheme["spouseStyle"]; onClick: object }) {
  const fs = s.fontSize;
  // (a knot where a daughter's children by an unrecorded father part: a
  // bead on her dotted line, a little larger than its dots)
  if (s.knot) {
    return (
      <g transform={`translate(${s.x.toFixed(1)} ${s.y.toFixed(1)})`} {...onClick}>
        <title>{s.member.name}</title>
        <circle r={fs * 0.3} fill={pal.branch(s.lineage ?? null)} />
      </g>
    );
  }
  const ink = pal.spouseInk;
  const text = s.lines.map((line, i) => (
    <text key={i} y={(i - (s.lines.length - 1) / 2) * fs * 1.05 - (style === "inscribed" ? fs * 0.12 : 0)} textAnchor="middle" dominantBaseline="central"
      fontSize={fs} fill={style === "inscribed" ? ink : pal.ink}>{line}</text>
  ));
  const frame = <SpouseFrame style={style} w={s.w} h={s.h} fs={fs} pal={pal} dotted={s.dotted} />;
  return (
    <g transform={`translate(${s.x.toFixed(1)} ${s.y.toFixed(1)})`} {...onClick} data-kind="spouse" data-spouse-of={s.partnerId} data-spouse-member={s.member.id}>
      <title>{s.member.name}</title>
      {frame}
      {text}
    </g>
  );
}

/** Where the name sits: higher when there are lines under it. */
function nameY(node: PosterNode) {
  const lines = node.subLabel ? node.subLabel.split("\n").length : 0;
  return lines ? -node.fontSize * (0.32 + (lines - 1) * 0.36) : 0;
}

/** The quieter line(s) under a name, starting at y (moved up for two lines). */
function SubLines({ node, y, fontSize, fill, opacity }: { node: PosterNode; y: number; fontSize: number; fill: string; opacity: number }) {
  if (!node.subLabel) return null;
  const lines = node.subLabel.split("\n");
  const step = fontSize * 1.08;
  const top = y - (lines.length - 1) * node.fontSize * 0.36;
  return (
    <>
      {lines.map((line, i) => (
        <text key={i} y={top + i * step} textAnchor="middle" dominantBaseline="central" fontSize={fontSize} fill={fill} opacity={opacity}>
          {line}
        </text>
      ))}
    </>
  );
}

function PersonNode({
  node, fill, border, text, pal, onClick, detail = null,
}: {
  node: PosterNode;
  fill: string;
  border: string;
  text: string;
  pal: Palette;
  onClick: object;
  /** The design's rim: engraved (a second line inside), metal (a fine highlight inside), or plain. */
  detail?: PosterPalette["rimStyle"] | null;
}) {
  const fs = node.fontSize;
  const sw = fs * 0.06;
  const leaf = node.shape === "leaf";
  // Leaves keep their text upright by flipping when they point leftwards.
  const flip = leaf && (node.angle > 90 || node.angle < -90);
  let body: ReactNode;
  switch (node.shape) {
    case "leaf":
      body = (
        <>
          <path d={leafPath(node.leafLength, node.leafWidth)} fill={fill} stroke={border} strokeWidth={sw} />
          {!pal.mono && (
            <path
              d={`M${(-node.leafLength / 2).toFixed(1)} 0Q0 ${(-node.leafWidth * 0.05).toFixed(1)} ${(node.leafLength * 0.47).toFixed(1)} 0`}
              stroke={border} strokeWidth={fs * 0.025} fill="none" opacity={0.25}
            />
          )}
        </>
      );
      break;
    case "circle":
      // (a long name's roundel is a capsule of the same height)
      body = node.w > node.h + 0.5
        ? <rect x={-node.w / 2} y={-node.h / 2} width={node.w} height={node.h} rx={node.h / 2} fill={fill} stroke={border} strokeWidth={sw * 1.2} />
        : <circle r={node.w / 2} fill={fill} stroke={border} strokeWidth={sw * 1.2} />;
      break;
    case "oval":
      body = <ellipse rx={node.w / 2} ry={node.h / 2} fill={fill} stroke={border} strokeWidth={sw} />;
      break;
    default:
      body = <rect x={-node.w / 2} y={-node.h / 2} width={node.w} height={node.h} rx={node.h / 2} fill={fill} stroke={border} strokeWidth={sw} />;
  }
  // the design's rim detail, inside the outline (never on leaves)
  const inner = (() => {
    if (!detail || detail === "fill" || detail === "gold" || node.shape === "leaf") return null;
    const g = sw * (detail === "engraved" ? 2.4 : 1.4);
    const props = detail === "engraved"
      ? { fill: "none", stroke: border, strokeWidth: sw * 0.45, opacity: 0.65 }
      : { fill: "none", stroke: "#ffffff", strokeWidth: sw * 0.55, opacity: 0.55 };
    if (node.shape === "oval") return <ellipse rx={node.w / 2 - g} ry={node.h / 2 - g} {...props} />;
    if (node.shape === "circle" && !(node.w > node.h + 0.5)) return <circle r={node.w / 2 - g} {...props} />;
    return <rect x={-node.w / 2 + g} y={-node.h / 2 + g} width={node.w - 2 * g} height={node.h - 2 * g} rx={node.h / 2 - g} {...props} />;
  })();
  // a parent: a second, gold ring just outside the name (the key's "له ذرية")
  const ring = node.terminal ? null : (() => {
    const g = fs * 0.16, stroke = pal.ornament, w = sw * 1.1;
    switch (node.shape) {
      case "leaf": return null;
      case "circle": return node.w > node.h + 0.5
        ? <rect x={-node.w / 2 - g} y={-node.h / 2 - g} width={node.w + 2 * g} height={node.h + 2 * g} rx={node.h / 2 + g} fill="none" stroke={stroke} strokeWidth={w} />
        : <circle r={node.w / 2 + g} fill="none" stroke={stroke} strokeWidth={w} />;
      case "oval": return <ellipse rx={node.w / 2 + g} ry={node.h / 2 + g} fill="none" stroke={stroke} strokeWidth={w} />;
      default: return <rect x={-node.w / 2 - g} y={-node.h / 2 - g} width={node.w + 2 * g} height={node.h + 2 * g} rx={node.h / 2 + g} fill="none" stroke={stroke} strokeWidth={w} />;
    }
  })();
  return (
    <g transform={`translate(${node.x.toFixed(1)} ${node.y.toFixed(1)})${leaf ? ` rotate(${node.angle.toFixed(1)})` : ""}`} {...onClick} data-kind="person" data-person={node.id} data-shape={node.shape}>
      <title>{node.label}</title>
      {ring}
      {body}
      {inner}
      <g transform={flip ? "rotate(180)" : undefined}>
        <text y={nameY(node)} textAnchor="middle" dominantBaseline="central" fontSize={fs} fontWeight={node.terminal ? 400 : 700} fill={text}>
          {node.label}
        </text>
        <SubLines node={node} y={fs * 0.55} fontSize={fs * 0.7} fill={text} opacity={0.85} />
      </g>
    </g>
  );
}

/**
 * The foundation, whatever its soil style: the style laid out shapes (in
 * drawing order) and texts (in reading order) with colour roles, and this
 * draws them. A new style needs no change here.
 */
function Foundation({ layout, pal, bark, click }: {
  layout: PosterLayout;
  pal: Palette;
  bark: string;
  click: (id: string) => object;
}) {
  const soil = layout.soil!;
  const colour = (ink: SoilInk | undefined): string | undefined => {
    if (!ink) return undefined;
    if (pal.mono) return ink === "ivory" || ink === "trunk" || ink === "paper" ? "#ffffff" : "#111111";
    // (the trunk's shading is laid across the page, so the taproot and the
    // roots continue it with no seam)
    const trunk = `url(#${pal.uid}-trunk)`;
    return { ink: pal.ink, gold: pal.ornament, goldLight: pal.thread, muted: pal.muted, bark, trunk, root: trunk, ivory: pal.ivory, line: pal.line, paper: pal.paper }[ink];
  };
  return (
    <g data-soil={soil.style}>
      {soil.shapes.map((s, i) => (
        <path
          key={i}
          d={(s.orn && soilOrnament(s.orn.kind, s.orn.x, s.orn.y, s.orn.s, pal.frame)) || s.d}
          fill={colour(s.fill) ?? "none"}
          fillOpacity={s.opacity}
          stroke={colour(s.stroke) ?? (pal.mono && s.fill === "trunk" ? "#111111" : undefined)}
          strokeWidth={s.strokeWidth ?? (pal.mono && s.fill === "trunk" ? layout.width * 0.0012 : undefined)}
          strokeDasharray={s.dash?.map((n) => n.toFixed(1)).join(" ")}
          strokeLinecap="round"
        />
      ))}
      {soil.texts.map((t, i) => (
        <FitText
          key={i}
          max={t.maxWidth ?? roomIn(soil.area, t.x, t.anchor, layout.rtl)}
          x={t.x.toFixed(1)}
          y={t.y.toFixed(1)}
          fontSize={t.fontSize.toFixed(2)}
          textAnchor={t.anchor}
          fill={colour(t.ink)}
          fontFamily={t.font === "ruqaa" && pal.titleFont !== "kufi" ? RUQAA : undefined}
          fontWeight={t.weight}
          direction={layout.rtl ? "rtl" : "ltr"}
          {...(t.memberId ? click(t.memberId) : {})}
        >
          {t.text}
        </FitText>
      ))}
    </g>
  );
}

/** The width a text anchored at `x` has inside the foundation's area. */
function roomIn(area: { x: number; w: number } | undefined, x: number, anchor: "start" | "middle" | "end", rtl: boolean): number | undefined {
  if (!area) return undefined;
  const left = x - area.x, right = area.x + area.w - x;
  if (anchor === "middle") return 2 * Math.max(0, Math.min(left, right));
  // "start" runs leftward in right-to-left text, rightward otherwise
  return (anchor === "start") === rtl ? left : right;
}

/**
 * A text that never runs wider than `max`: measured as drawn, and condensed
 * to fit when it comes out wider (a font other than Amiri, which the layout
 * measures with, or one still loading). Measured again once fonts load; an
 * export copies the drawn poster, so it keeps the fit.
 */
function FitText({ max, ...props }: SVGProps<SVGTextElement> & { max?: number }) {
  const ref = useRef<SVGTextElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !max || typeof el.getComputedTextLength !== "function") return;
    const fit = () => {
      el.removeAttribute("textLength");
      el.removeAttribute("lengthAdjust");
      if (el.getComputedTextLength() > max) {
        el.setAttribute("textLength", max.toFixed(1));
        el.setAttribute("lengthAdjust", "spacingAndGlyphs");
      }
    };
    fit();
    const fonts = typeof document !== "undefined" ? document.fonts : undefined;
    let live = true;
    void fonts?.ready.then(() => live && fit());
    fonts?.addEventListener?.("loadingdone", fit);
    return () => {
      live = false;
      fonts?.removeEventListener?.("loadingdone", fit);
    };
  }, [max, props.children, props.fontSize, props.fontFamily, props.fontWeight]);
  return <text ref={ref} {...props} />;
}

/**
 * A faint, soft wash of each main branch's colour behind its lines and
 * names, so a whole lineage can be followed at a glance. It starts at the
 * first generation (the lines out of the canopy base, where every branch
 * meets, are left plain) and is blurred so it has no edge of its own.
 */
function BranchTints({ layout, pal }: { layout: PosterLayout; pal: Palette }) {
  const baseId = layout.base?.member.id;
  const sizes = layout.nodes.map((n) => n.fontSize).sort((a, b) => a - b);
  const fs = sizes[sizes.length >> 1] ?? layout.width * 0.008;
  const groups = new Map<number, { lines: string[]; dots: { x: number; y: number; r: number }[] }>();
  const at = (i: number) => {
    if (!groups.has(i)) groups.set(i, { lines: [], dots: [] });
    return groups.get(i)!;
  };
  for (const e of layout.edges) {
    if (e.lineage == null || e.parentId === baseId || e.points.length < 2) continue;
    at(e.lineage).lines.push(e.points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" "));
  }
  for (const n of layout.nodes) {
    if (n.lineage == null) continue;
    at(n.lineage).dots.push({ x: n.x, y: n.y, r: Math.max(n.w, n.h) / 2 + fs * 0.9 });
  }
  return (
    <g aria-hidden>
      <defs>
        <filter id={`${pal.uid}-tint-blur`} x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation={(fs * 1.6).toFixed(1)} />
        </filter>
      </defs>
      {[...groups].map(([lineage, g]) => (
        <g key={lineage} opacity={0.11} filter={`url(#${pal.uid}-tint-blur)`}>
          <g fill="none" stroke={pal.branch(lineage)} strokeWidth={fs * 3.4} strokeLinecap="round" strokeLinejoin="round">
            {g.lines.map((pts, i) => <polyline key={i} points={pts} />)}
          </g>
          <g fill={pal.branch(lineage)}>
            {g.dots.map((d, i) => <circle key={i} cx={d.x.toFixed(1)} cy={d.y.toFixed(1)} r={d.r.toFixed(1)} />)}
          </g>
        </g>
      ))}
    </g>
  );
}

/** Basmala, the calligraphic title, subtitle and a fine divider. */
function Header({ layout, meta, theme, pal }: { layout: PosterLayout; meta: PosterMeta; theme: PosterTheme; pal: Palette }) {
  const { width: W, height: H, rtl } = layout;
  const hd = layout.frame.header;
  const avail = layout.medallions.length ? Math.min(hd.maxTitleWidth, W * 0.44) : hd.maxTitleWidth;
  // Ruqaa runs a little wider than Amiri, which textWidth is tuned for;
  // Kufi wider still
  const kufi = pal.titleFont === "kufi";
  const titleFs = meta.title ? Math.min(W * (kufi ? 0.036 : 0.042), avail / ((textWidth(meta.title, 1) || 1) * (kufi ? 1.45 : 1.1))) : 0;
  // Under the basmala, the title keeps clear of its long lower stroke: the
  // glyph reaches 0.61 em below its baseline and Ruqaa capitals 1.23 em above.
  const basmalaFs = W * 0.024;
  const titleY = theme.bismillah
    ? Math.max(hd.title, hd.basmala + basmalaFs * 0.61 + titleFs * 1.23 + W * 0.012)
    : layout.frame.framed ? hd.title : H * 0.052;
  // (a cartouche or panel round the title: what follows starts below it)
  const grounded = !pal.mono && (pal.titleStyle === "cartouche" || pal.titleStyle === "panel");
  const groundBottom = titleY + titleFs * 0.62;
  const subFs = Math.min(W * 0.017, titleFs * 0.55);
  const below = (y: number, fs: number) => (grounded ? Math.max(y, groundBottom + fs * 1.15) : y);
  const subY = below(titleY + H * 0.024, subFs);
  // a branch poster's "فرع …" line takes the subtitle's place
  const subtitle = layout.focus ? null : meta.subtitle;
  const focusY = below(titleY + H * 0.024, Math.min(W * 0.015, (titleFs || W * 0.03) * 0.48));
  const lastY = layout.focus ? focusY : subtitle ? subY : titleY;
  const edition = theme.edition ? editionLine(meta.updated, rtl) : null;
  return (
    <g>
      {theme.bismillah && (
        // Amiri draws the basmala (U+FDFD) as one wide calligraphic glyph (~11 em)
        <text x={W / 2} y={hd.basmala} textAnchor="middle" fontSize={basmalaFs} fill={pal.ink}>
          ﷽
        </text>
      )}
      {meta.title && !pal.mono && (
        <TitleGround cx={W / 2} cy={titleY - titleFs * 0.38} tw={(textWidth(meta.title, 1) || 1) * titleFs * (kufi ? 1.45 : 1.1)} fs={titleFs} W={W} pal={pal} maxW={avail} />
      )}
      {meta.title && (
        <text x={W / 2} y={titleY} textAnchor="middle" fontFamily={kufi ? KUFI : RUQAA} fontSize={titleFs} fontWeight={kufi ? 400 : 700}
          fill={pal.mono ? pal.ink : `url(#${pal.uid}-gold-text)`} direction={rtl ? "rtl" : "ltr"}>
          {meta.title}
        </text>
      )}
      {subtitle && (
        <text x={W / 2} y={subY} textAnchor="middle" fontSize={subFs} fill={pal.inkSoft} direction={rtl ? "rtl" : "ltr"}>
          {subtitle}
        </text>
      )}
      {layout.focus && (
        // a branch-only poster says whose branch it is
        <text x={W / 2} y={focusY} textAnchor="middle" fontSize={Math.min(W * 0.015, (titleFs || W * 0.03) * 0.48)}
          fill={pal.inkSoft} direction={rtl ? "rtl" : "ltr"}>
          {rtl ? `فرع ${layout.focus.label}` : `Branch of ${layout.focus.label}`}
        </text>
      )}
      {/* (a cartouche or panel round the title takes the rule's place) */}
      {(pal.mono || (pal.titleStyle !== "cartouche" && pal.titleStyle !== "panel")) && (
        <TitleRule x={W / 2} y={lastY + H * 0.014} w={Math.min(W * 0.26, avail * 0.6)} pal={pal} accent={theme.male} />
      )}
      {edition && (
        <text x={W / 2} y={grounded ? Math.max(lastY === titleY ? groundBottom : lastY, groundBottom) + W * 0.016 : lastY + H * 0.014 + W * 0.016} textAnchor="middle" dominantBaseline="central" fontSize={W * 0.0105}
          fill={pal.edition} letterSpacing={W * 0.0004} direction={rtl ? "rtl" : "ltr"}>
          {edition}
        </text>
      )}
    </g>
  );
}

/** "طبعة ١٤٤٨ هـ / ٢٠٢٦ م" (no middle dot: in Arabic it reads as the digit zero): the year of the family's last update, both calendars on an Arabic poster. */
function editionLine(updated: string | null | undefined, rtl: boolean): string {
  const at = updated ? new Date(updated) : new Date();
  const when = Number.isNaN(at.getTime()) ? new Date() : at;
  if (!rtl) return `Edition ${when.getFullYear()}`;
  const hijri = when.toLocaleDateString("ar-SA-u-ca-islamic-umalqura", { year: "numeric" });
  const greg = when.toLocaleDateString("ar-SA-u-ca-gregory", { year: "numeric" });
  return `طبعة ${hijri} / ${greg} م`;
}

/** Round medallion carrying a verse or hadith, in fine gold lines. */
function TextMedallion({ x, y, r, content, pal }: { x: number; y: number; r: number; content: typeof VERSE; pal: Palette }) {
  const set = textInCircle(r * 0.8, content.heading, content.body, content.footer);
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill={pal.ivory} stroke={pal.line} strokeWidth={r * 0.02} />
      <circle cx={x} cy={y} r={r * 0.93} fill="none" stroke={pal.line} strokeWidth={r * 0.007} />
      {set.lines.map((l, i) => (
        <text key={i} x={x} y={y + l.y} textAnchor="middle" dominantBaseline="central" direction="rtl" fontSize={l.size} fontWeight={l.bold ? 700 : 400} fill={pal.ink}>
          {l.text}
        </text>
      ))}
    </g>
  );
}

/**
 * The foot of the poster, in three quiet bands: the key (what each shape and
 * line means), the family's numbers on small cards, and the credit with the
 * date it was last updated.
 */
/** The least a key too wide for its row is scaled to (see Footer). */
const KEY_MIN = 0.8;
/** Between the key's entries, in its text size. */
const KEY_GAP = 1.8;

function Footer({ layout, theme, pal, meta }: { layout: PosterLayout; theme: PosterTheme; pal: Palette; meta: PosterMeta }) {
  const { width: W, rtl, stats, generationsPresent, generationOffset } = layout;
  const fs = W * 0.012;
  // key, the cards, then the credit on footerY
  // (set a little low, the cards and credit closer under it: a clear line
  // of paper between the key and the foundation above, which once touched)
  const y = layout.frame.footerY - fs * 4.15;
  const sw = fs * 1.9; // swatch width
  const satin = theme.metallic && !pal.mono;
  // the key's row: inside the frame, or most of the page's width
  const keyRoom = W * (layout.frame.framed ? 0.74 : 0.9);
  const pill = (x: number, fill: string, stroke: string) => (
    <rect x={x} y={y - fs * 0.45} width={sw} height={fs * 0.9} rx={fs * 0.45} fill={fill} stroke={stroke} strokeWidth={fs * 0.09} />
  );
  /** A key entry: its symbol (`width` wide, the usual swatch's by default) and what it means. */
  type Item = { key?: string; label: string; swatch: (x: number) => ReactNode; width?: number };
  const items: Item[] = [];
  const maleFill = pal.mono ? "#fff" : satin ? `url(#${pal.uid}-satin-m)` : theme.male;
  const femaleFill = pal.mono ? "#fff" : satin ? `url(#${pal.uid}-satin-f)` : theme.female;
  const rim = (c: string) => (pal.mono ? "#111" : rimOn(c, pal.paper));
  // colouring by generation replaces the son / daughter / father colours
  const byGender = theme.colorBy !== "generation";
  if (byGender) items.push({
    key: "son",
    label: say(LEGEND.son, rtl),
    // (the shape actually drawn: "auto" may have chosen either)
    swatch: (x) => layout.nodes.some((n) => n.shape === "leaf")
      ? <path transform={`translate(${x + sw / 2} ${y}) scale(${sw})`} d={leafPath(1, 0.45)} fill={maleFill} stroke={rim(theme.male)} strokeWidth={0.04} />
      : pill(x, maleFill, rim(theme.male)),
  });
  if (byGender && layout.nodes.some((n) => n.member.gender === "FEMALE")) items.push({ key: "daughter", label: say(LEGEND.daughter, rtl), swatch: (x) => pill(x, femaleFill, rim(theme.female)) });
  // (a parent: the same colours, with a second gold ring)
  items.push({
    key: "descendants",
    label: say(LEGEND.descendants, rtl),
    swatch: (x) => (
      <g>
        <rect x={x - fs * 0.14} y={y - fs * 0.59} width={sw + fs * 0.28} height={fs * 1.18} rx={fs * 0.59} fill="none" stroke={pal.ornament} strokeWidth={fs * 0.09} />
        {pill(x, byGender ? maleFill : pal.legendParent, byGender ? rim(theme.male) : pal.line)}
      </g>
    ),
  });
  // (the trunk's names: the line the poster follows, through fathers or through mothers)
  if (layout.trunkLabels.length) items.push({ key: "lineage", label: say(LEGEND.lineage, rtl), swatch: (x) => pill(x, pal.ivory, pal.line) });
  // every branch colour the poster actually uses (the palette's colours
  // repeat past its length), each a short bar
  const lineages = new Set(layout.nodes.map((n) => n.lineage).filter((x): x is number => x != null));
  if (theme.branchColors && !pal.mono && lineages.size >= 2) {
    const used = [...new Set([...lineages].map((i) => pal.branch(i)))];
    items.push({
      key: "branch-colours",
      label: say(LEGEND.branchColours, rtl),
      swatch: (x) => (
        <g>
          {used.map((c, k) => (
            <rect key={k} data-branch-colour={c} x={x + (k * sw) / used.length} y={y - fs * 0.12} width={sw / used.length - fs * 0.08} height={fs * 0.24} rx={fs * 0.08} fill={c} />
          ))}
        </g>
      ),
      width: Math.max(sw, used.length * fs * 0.5),
    });
  }
  if (layout.branches.some((b) => b.dotted)) {
    items.push({
      key: "through-daughters",
      label: say(LEGEND.throughDaughters, rtl),
      swatch: (x) => (
        <line x1={x + fs * 0.2} y1={y} x2={x + sw - fs * 0.2} y2={y} stroke={pal.branch(null)} strokeWidth={fs * 0.22} strokeLinecap="round" strokeDasharray={`0.01 ${(fs * 0.46).toFixed(1)}`} />
      ),
    });
  }
  const drawnSpouses = layout.spouses.filter((s) => !s.knot);
  if (drawnSpouses.length) {
    items.push({
      key: "spouse",
      label: spouseLabel(drawnSpouses.map((s) => s.member.gender), rtl),
      // (the poster's own frame, at the key's size; dashed when every spouse
      // drawn is a daughter's husband on her dotted line)
      swatch: (x) => (
        <g transform={`translate(${x + sw / 2} ${y})`}>
          <SpouseFrame style={theme.spouseStyle ?? "manuscript"} w={sw} h={fs * 0.95} fs={fs} pal={pal} dotted={drawnSpouses.every((s) => s.dotted)} />
        </g>
      ),
    });
  }
  // Every generation's colour on the poster is explained: each named while
  // there are few, otherwise one row of chips numbered by generation.
  if (theme.colorBy === "generation" && generationsPresent.length) {
    const named: Item[] = generationsPresent.map((g) => {
      const c = generationColor(g - generationOffset).fill;
      return { label: generationLabel(g - generationOffset, rtl), swatch: (x: number) => pill(x, c, shade(c, -0.35)) };
    });
    const rowWidth = (list: Item[]) => list.reduce((a, it) => a + (it.width ?? sw) + fs * 0.5 + textWidth(it.label, fs), 0) + KEY_GAP * fs * (list.length - 1);
    // (named while few and while they fit the row, as far as KEY_MIN)
    if (generationsPresent.length <= NAMED_GENERATIONS && rowWidth([...items, ...named]) <= keyRoom / KEY_MIN) {
      items.push(...named);
    } else {
      // (narrower chips for many generations: as wide as the room the other
      // entries leave, so the key keeps inside the frame)
      const chipGap = fs * 0.1;
      const others = items.reduce((a, it) => a + (it.width ?? sw) + fs * 0.5 + textWidth(it.label, fs) + KEY_GAP * fs, 0);
      const left = keyRoom / KEY_MIN - others - fs * 0.5 - textWidth(say(LEGEND.generations, rtl), fs);
      const chip = Math.max(fs * 0.8, Math.min(fs * 1.25, left / generationsPresent.length - chipGap));
      const gens = generationsPresent;
      const stripW = gens.length * chip + (gens.length - 1) * chipGap;
      items.push({
        key: "generations",
        label: say(LEGEND.generations, rtl),
        width: stripW,
        swatch: (x) => (
          <g>
            {gens.map((g, k) => {
              const c = generationColor(g - generationOffset);
              // reading order: the first generation on the right in Arabic
              const cx = rtl ? x + stripW - chip / 2 - k * (chip + chipGap) : x + chip / 2 + k * (chip + chipGap);
              return (
                <g key={g} data-generation={g - generationOffset + 1}>
                  <rect x={cx - chip / 2} y={y - fs * 0.5} width={chip} height={fs} rx={fs * 0.22} fill={c.fill} stroke={shade(c.fill, -0.35)} strokeWidth={fs * 0.06} />
                  <text x={cx} y={y} dominantBaseline="central" textAnchor="middle" fontSize={fs * 0.62} fontWeight={700} fill={c.text}>
                    {(g - generationOffset + 1).toLocaleString(rtl ? "ar-EG" : "en-US", { useGrouping: false })}
                  </text>
                </g>
              );
            })}
          </g>
        ),
      });
    }
  }
  const fmt = (n: number) => n.toLocaleString(rtl ? "ar-SA" : "en-US");
  // The numbers, each on its own small card (a number over its name)
  const cards = statCards(stats, rtl);
  // (as wide as the longest label needs, "Number of generations" included)
  const cardW = Math.max(fs * 4.4, ...cards.map(([label]) => textWidth(label, fs * 0.62) + fs * 0.9)), cardH = fs * 1.95, cardGap = fs * 0.7, cardY = layout.frame.footerY - fs * 2.05;
  const cardsW = cards.length * cardW + (cards.length - 1) * cardGap;
  const ink = pal.footerInk;
  const gold = pal.rule;
  const cardEls = (rtl ? [...cards] : cards).map(([label, n], i) => {
    // (RTL: the first card on the right)
    const cx = rtl ? W / 2 + cardsW / 2 - cardW / 2 - i * (cardW + cardGap) : W / 2 - cardsW / 2 + cardW / 2 + i * (cardW + cardGap);
    return (
      <g key={label} transform={`translate(${cx.toFixed(1)} ${cardY.toFixed(1)})`}>
        <rect x={-cardW / 2} y={-cardH / 2} width={cardW} height={cardH} rx={fs * 0.3} fill={pal.ivory} stroke={gold} strokeWidth={fs * 0.05} />
        <text y={-cardH * 0.13} textAnchor="middle" dominantBaseline="central" fontSize={fs * 1.05} fontWeight={700} fill={pal.figure}>{fmt(n)}</text>
        <text y={cardH * 0.28} textAnchor="middle" dominantBaseline="central" direction={rtl ? "rtl" : "ltr"} fontSize={fs * 0.62} fill={ink}>{label}</text>
      </g>
    );
  });
  // last updated: the month, in both calendars on an Arabic poster
  const when = meta.updated ? new Date(meta.updated) : null;
  const updated = when && !Number.isNaN(when.getTime())
    ? rtl
      ? `آخر تحديث: ${when.toLocaleDateString("ar-SA-u-ca-islamic-umalqura", { month: "long", year: "numeric" })} / ${when.toLocaleDateString("ar-SA-u-ca-gregory", { month: "long", year: "numeric" })} م`
      : `Last updated ${when.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}`
    : null;
  // (on an Arabic poster the family's name only when it is written in
  // Arabic: a Latin file name read oddly among the Arabic)
  const named = rtl ? /[\u0600-\u06FF]/.test(meta.name) : !!meta.name.trim();
  const credit = rtl ? `${named ? `${meta.name} — ` : ""}صُمّمت بواسطة شجرة` : `${named ? `${meta.name} — ` : ""}made with Shajarah`;
  // lay the key out from the centre; RTL reads right to left
  // (a key wider than the space inside the frame is set a little smaller
  // to fit, as far as KEY_MIN of its size; it has never needed to be)
  const gap = fs * KEY_GAP;
  const symW = (it: Item) => it.width ?? sw;
  const natural = items.map((it) => symW(it) + fs * 0.5 + textWidth(it.label, fs));
  const room = keyRoom;
  const rawTotal = natural.reduce((a, b) => a + b, 0) + gap * (items.length - 1);
  const k = Math.max(KEY_MIN, Math.min(1, room / Math.max(1, rawTotal)));
  const total = rawTotal * k;
  let cursor = rtl ? W / 2 + total / 2 : W / 2 - total / 2;
  const placed = items.map((it, i) => {
    const w = natural[i] * k;
    const x0 = rtl ? cursor - w : cursor;
    cursor = rtl ? cursor - w - gap * k : cursor + w + gap * k;
    // swatch on the reading-start side of each label
    const sx = rtl ? x0 + w - symW(it) * k : x0;
    const textX = rtl ? sx - fs * 0.5 * k : x0 + (symW(it) + fs * 0.5) * k;
    return (
      <g key={i} data-legend={it.key}>
        <g transform={k < 1 ? `translate(${sx.toFixed(1)} ${y.toFixed(1)}) scale(${k.toFixed(3)}) translate(${(-sx).toFixed(1)} ${(-y).toFixed(1)})` : undefined}>
          {it.swatch(sx)}
        </g>
        {/* with direction=rtl, "start" is the right edge of the text */}
        <text x={textX} y={y} dominantBaseline="central" textAnchor="start" direction={rtl ? "rtl" : "ltr"} fontSize={fs * k} fill={pal.ink}>
          {it.label}
        </text>
      </g>
    );
  });
  return (
    <g data-key-width={total.toFixed(1)} data-key-room={room.toFixed(1)}>
      {placed}
      {cardEls}
      <text x={W / 2} y={layout.frame.footerY} dominantBaseline="central" textAnchor="middle" fontSize={fs * 0.72} fill={pal.creditInk} direction={rtl ? "rtl" : "ltr"}>
        {/* (in Arabic a middle dot reads as the digit zero: a comma) */}
        {updated ? (rtl ? `${credit}، ${updated}` : `${credit}  ·  ${updated}`) : credit}
      </text>
    </g>
  );
}

/** Generic names for the foundation previews (the same lineage in every style, so they compare fairly). */
const PREVIEW_NAMES = {
  rtl: ["سالم", "عبد الله", "محمد", "عمر", "إبراهيم", "سعد", "خالد", "ناصر", "علي", "حمد", "زيد", "فهد", "سليمان", "يوسف", "حسن", "آدم"],
  ltr: ["Salim", "Abdullah", "Muhammad", "Umar", "Ibrahim", "Saad", "Khalid", "Nasir", "Ali", "Hamad", "Zayd", "Fahd", "Sulayman", "Yusuf", "Hasan", "Adam"],
};

/**
 * A foundation style in miniature: a short trunk and a sample lineage laid
 * out by the style itself (its own measure and layout) and drawn by the
 * poster's own Foundation renderer, in the theme's palette and ornaments.
 */
export const SoilPreview = memo(function SoilPreview({ style, theme, rtl = true, idPrefix, className }: {
  style: SoilStyleId; theme: PosterTheme; rtl?: boolean; idPrefix: string; className?: string;
}) {
  const W = 700, cx = W / 2, groundY = 150, trunkWidth = 64;
  const names = rtl ? PREVIEW_NAMES.rtl : PREVIEW_NAMES.ltr;
  const joiner = rtl ? " بن " : " son of ";
  const entries = names.map((label, i) => ({ id: null, label, generation: names.length - i + 3 }));
  const ctx: SoilContext = {
    entries, text: [rtl ? "أحمد" : "Ahmad", ...names].join(joiner), custom: false, trunkName: null, rtl, joiner,
    f: 22, nameFont: 17, floor: 13, maxFont: 34, maxWidth: W * 0.84, avail: 1050, textWidth,
  };
  const def = soilStyle(style);
  const soil = def.layout({ ...ctx, cx, groundY, threadFrom: groundY - 26, trunkWidth, W: 1400 });
  const H = groundY + def.height(ctx) + 16;
  const stub = { soil: { ...soil, area: { x: cx - ctx.maxWidth / 2, w: ctx.maxWidth } }, width: 1400, rtl } as unknown as PosterLayout;
  const pal = makePalette(theme, { generationOffset: 0, nodes: [] } as unknown as PosterLayout, idPrefix);
  const bark = pal.mono ? "#1a1a1a" : theme.branch;
  // the trunk: straight down to the ground, then into the style's own meeting with it
  const hw = trunkWidth / 2;
  const trunk = soil.trunkTaper > 0
    ? `M${cx - hw} 0V${groundY - 10}Q${cx - hw} ${groundY + soil.trunkTaper * 0.4} ${cx} ${groundY + soil.trunkTaper}Q${cx + hw} ${groundY + soil.trunkTaper * 0.4} ${cx + hw} ${groundY - 10}V0Z`
    : (() => {
      const flare = hw * (1 + soil.trunkSpread * 1.3);
      return `M${cx - hw} 0V${groundY - 30}Q${cx - hw} ${groundY} ${cx - flare} ${groundY}H${cx + flare}Q${cx + hw} ${groundY} ${cx + hw} ${groundY - 30}V0Z`;
    })();
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={className} fontFamily={FONT} role="img" aria-label={def.label}>
      <defs>
        <TrunkGradient id={`${pal.uid}-trunk`} bark={bark} d={trunk} />
      </defs>
      <rect width={W} height={H} fill={pal.paper} />
      {soil.ground && <path d={soil.ground} fill="none" stroke={bark} strokeWidth={2.4} strokeLinecap="round" opacity={0.7} />}
      <g fill={bark} opacity={0.75}>{soil.roots.map((d, i) => <path key={i} d={d} />)}</g>
      <path d={trunk} fill={pal.mono ? "#ffffff" : `url(#${pal.uid}-trunk)`} stroke={pal.mono ? "#111" : "none"} strokeWidth={2} />
      <Foundation layout={stub} pal={pal} bark={bark} click={() => ({})} />
    </svg>
  );
});

/** The x-extent of an absolute path (its points and control points). */
function xExtent(d: string): [number, number] {
  const xs = [...d.matchAll(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g)].map((m) => Number(m[1]));
  return xs.length ? [Math.min(...xs), Math.max(...xs)] : [0, 1];
}

/**
 * The trunk's shading, a soft light down its middle, laid across the page
 * from the trunk's left edge to its right: the trunk looks as it always has,
 * and anything else filled with it (the taproot, the spine, the roots)
 * takes the same shade at the same place, so it continues the trunk with no
 * seam where they meet.
 */
function TrunkGradient({ id, bark, d }: { id: string; bark: string; d: string }) {
  const [x0, x1] = xExtent(d);
  return (
    <linearGradient id={id} gradientUnits="userSpaceOnUse" x1={x0.toFixed(1)} y1="0" x2={x1.toFixed(1)} y2="0">
      <stop offset="0" stopColor={shade(bark, -0.1)} />
      <stop offset="0.45" stopColor={shade(bark, 0.1)} />
      <stop offset="1" stopColor={shade(bark, -0.18)} />
    </linearGradient>
  );
}
