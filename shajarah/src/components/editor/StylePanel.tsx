"use client";

import { SOIL_STYLES, SOIL_STYLE_ORDER } from "@/lib/layout/soil";
import { memo, useState } from "react";
import { useDismiss } from "../useDismiss";
import { compactTheme, isInkOnly, resetDesign, THEME_PRESETS } from "@/lib/theme";
import type { PosterLayout } from "@/lib/layout/botanical";
import type { PosterTheme, ThemePreset } from "@/lib/types";
import { Icon } from "@/components/Icon";
import { SoilPreview, TreePoster, type PosterMeta } from "@/components/poster/TreePoster";

/** A preset's own design, as choosing it sets it (its name and description aside). */
const designOf = (p: ThemePreset): PosterTheme => {
  const { label: _l, description: _d, ...design } = THEME_PRESETS[p];
  return design;
};

/**
 * The family's own poster drawn in a design, small: the current layout in
 * that design's palette, frame, title and rims (a design that sets other
 * shapes or another foundation shows them once chosen).
 */
const ThemePreview = memo(function ThemePreview({ layout, meta, theme, frameSrc }: { layout: PosterLayout; meta: PosterMeta; theme: PosterTheme; frameSrc?: string | null }) {
  return <TreePoster layout={layout} meta={meta} theme={theme} frameSrc={frameSrc} idPrefix={`pv-${theme.preset}`} className="pointer-events-none block h-auto w-full" />;
});

interface Props {
  theme: PosterTheme;
  onChange: (theme: Partial<PosterTheme>) => void;
  soilText: string | null;
  onSoilTextChange: (text: string | null) => void;
  /** Whether the frame artwork (public/poster-frame.jpg or .png) was found. */
  frameAvailable?: boolean;
  /** The poster as it is now, for the designs' previews (none while it is laid out). */
  layout?: PosterLayout | null;
  meta?: PosterMeta;
  frameSrc?: string | null;
}

/** Theme presets, colour pickers, node shape and label options. */
export function StylePanel({ theme, onChange, soilText, onSoilTextChange, frameAvailable = true, layout, meta, frameSrc }: Props) {
  const [open, setOpen] = useState(false);
  const menu = useDismiss<HTMLDivElement>(open, () => setOpen(false));
  const [soilDraft, setSoilDraft] = useState(soilText ?? "");
  const color = (key: "male" | "female" | "ancestor" | "branch", label: string) => (
    <label className="flex items-center justify-between gap-2 text-sm">
      {label}
      <input
        type="color"
        className="h-7 w-12 cursor-pointer rounded border border-parchment-300"
        value={theme[key]}
        onChange={(e) => onChange({ [key]: e.target.value })}
      />
    </label>
  );

  return (
    <div className="relative" ref={menu}>
      <button type="button" className="btn-outline whitespace-nowrap" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <Icon name="palette" className="me-1.5 h-4 w-4" />Style ▾
      </button>
      {open && (
        <div className="absolute end-0 z-30 mt-2 max-h-[80vh] w-[36rem] max-w-[calc(100vw-2rem)] space-y-4 overflow-auto rounded-lg border border-parchment-300 bg-white p-4 shadow-xl">
          <section>
            <h4 className="section-title">Design</h4>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(THEME_PRESETS) as ThemePreset[]).map((p) => {
                const t = THEME_PRESETS[p];
                const on = theme.preset === p;
                return (
                  <button
                    key={p}
                    type="button"
                    aria-pressed={on}
                    onClick={() => onChange(designOf(p))}
                    className={`overflow-hidden rounded-lg border text-start transition-shadow hover:shadow-md ${
                      on ? "border-bark-700 ring-2 ring-bark-700/40" : "border-parchment-300"
                    }`}
                  >
                    <span aria-hidden className="block aspect-[1/1.41] overflow-hidden bg-parchment-50">
                      {layout && meta
                        ? <ThemePreview layout={layout} meta={meta} theme={designOf(p)} frameSrc={frameSrc} />
                        : <span className="block h-full w-full" style={{ background: `linear-gradient(135deg, ${t.male}, ${t.female})` }} />}
                    </span>
                    <span className="block px-2 py-1.5">
                      <span className="flex items-center gap-1 text-sm font-semibold text-bark-900">
                        {on && <span aria-hidden className="text-bark-700">✓</span>}{t.label}
                      </span>
                      <span className="block text-[11px] leading-snug text-bark-500">{t.description}</span>
                    </span>
                  </button>
                );
              })}
            </div>
            {Object.keys(compactTheme(theme)).some((k) => ["male", "female", "ancestor", "branch", "background", "metallic", "nodeRim", "inkOnly"].includes(k)) && (
              <button type="button" className="btn-outline mt-2 w-full justify-center text-sm" onClick={() => onChange(resetDesign(theme))}
                title="Its colours, paper and finish as the design has them; your spouses, ornaments and labels stay">
                Reset to {THEME_PRESETS[theme.preset].label}&rsquo;s design
              </button>
            )}
          </section>

          <section className="space-y-1.5">
            <h4 className="section-title">Colours</h4>
            {color("male", "Male")}
            {color("female", "Female")}
            {color("ancestor", "Trunk medallions")}
            {color("branch", "Branches & trunk")}
            <label className="flex items-center justify-between text-sm">
              Colour nodes by
              <select className="input w-48" value={theme.colorBy} onChange={(e) => onChange({ colorBy: e.target.value as PosterTheme["colorBy"] })}>
                <option value="gender">Gender</option>
                <option value="generation">Generation</option>
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={theme.metallic} onChange={(e) => onChange({ metallic: e.target.checked })} />
              Metallic finish
            </label>
            <label className="flex items-center gap-2 text-sm" title="Black ink on paper: no colour, metal or frame artwork">
              <input type="checkbox" checked={isInkOnly(theme)} onChange={(e) => onChange({ inkOnly: e.target.checked })} />
              Black ink only
            </label>
          </section>

          <section>
            <h4 className="section-title">Foundation</h4>
            <p className="mb-1.5 text-xs text-gray-500">How the ancestors older than the trunk are set below it.</p>
            <div className="grid grid-cols-3 gap-2" role="group" aria-label="Foundation style">
              {SOIL_STYLE_ORDER.map((id) => {
                const on = theme.soilStyle === id;
                const recommended = THEME_PRESETS[theme.preset].soilStyle === id;
                return (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => onChange({ soilStyle: id })}
                    title={SOIL_STYLES[id].description}
                    className={`overflow-hidden rounded-lg border text-start transition-shadow hover:shadow-md ${
                      on ? "border-bark-700 ring-2 ring-bark-700/40" : "border-parchment-300"
                    }`}
                  >
                    <span aria-hidden className="block aspect-[4/3] overflow-hidden bg-parchment-50">
                      <SoilPreview style={id} theme={theme} rtl={layout?.rtl ?? true} idPrefix={`sp-${id}`} className="pointer-events-none block h-full w-full" />
                    </span>
                    <span className="block px-1.5 py-1">
                      <span className="flex items-center gap-1 text-xs font-semibold text-bark-900">
                        {on && <span aria-hidden className="text-bark-700">✓</span>}{SOIL_STYLES[id].label}
                      </span>
                      <span className="block text-[10px] leading-snug text-bark-500">
                        {SOIL_STYLES[id].description}{recommended ? ` Suggested for ${THEME_PRESETS[theme.preset].label}.` : ""}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
            {theme.soilStyle !== THEME_PRESETS[theme.preset].soilStyle && (
              <button type="button" className="btn-outline mt-2 w-full justify-center text-sm" onClick={() => onChange({ soilStyle: THEME_PRESETS[theme.preset].soilStyle })}>
                Use {THEME_PRESETS[theme.preset].label}&rsquo;s foundation ({SOIL_STYLES[THEME_PRESETS[theme.preset].soilStyle].label})
              </button>
            )}
          </section>

          <section className="space-y-1.5">
            <h4 className="section-title">Nodes & labels</h4>
            <label className="flex items-center justify-between text-sm">
              Shape
              <select className="input w-48" value={theme.nodeShape} onChange={(e) => onChange({ nodeShape: e.target.value as PosterTheme["nodeShape"] })}>
                <option value="auto">Auto</option>
                <option value="leaf">Leaves</option>
                <option value="circle">Circular badges</option>
                <option value="oval">Oval medallions</option>
              </select>
            </label>
            <label className="flex items-center justify-between text-sm">
              Label
              <select className="input w-48" value={theme.labelMode} onChange={(e) => onChange({ labelMode: e.target.value as PosterTheme["labelMode"] })}>
                <option value="name">First name</option>
                <option value="withFather">Name بن father</option>
              </select>
            </label>
            <label className="flex items-center justify-between text-sm">
              Trunk ancestors
              <select className="input w-48" value={theme.trunkStyle} onChange={(e) => onChange({ trunkStyle: e.target.value as PosterTheme["trunkStyle"] })}>
                <option value="carved">Carved in bark</option>
                <option value="badges">Framed badges</option>
              </select>
            </label>
            <label className="flex items-center justify-between text-sm" title="How a wife's (or husband's) name is set on the branch, when spouses are shown">
              Spouses
              <select className="input w-48" value={theme.spouseStyle} onChange={(e) => onChange({ spouseStyle: e.target.value as PosterTheme["spouseStyle"] })}>
                <option value="manuscript">Manuscript cartouche</option>
                <option value="capsule">Soft capsule</option>
                <option value="inscribed">Inscribed, no box</option>
              </select>
            </label>
            <label className="flex items-center justify-between text-sm" title="A lineage too long for the foundation's share of the page">
              Foundation names
              <select className="input w-48" value={theme.soilShorten ? "shorten" : "all"} onChange={(e) => onChange({ soilShorten: e.target.value === "shorten" })}>
                <option value="all">Every name</option>
                <option value="shorten">Shorten long lineages (…)</option>
              </select>
            </label>
            <label className="flex items-center justify-between text-sm">
              Paper
              <select className="input w-48" value={theme.background} onChange={(e) => onChange({ background: e.target.value as PosterTheme["background"], inkOnly: isInkOnly(theme) })}>
                <option value="parchment">The design&rsquo;s own</option>
                <option value="white">Plain white</option>
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={theme.showYears} onChange={(e) => onChange({ showYears: e.target.checked })} />
              Show birth / death years
            </label>
            <label className="flex items-center gap-2 text-sm" title="Each wife a man had children with is a name panel on his branch, and the children she bore him grow from it">
              <input type="checkbox" checked={theme.motherNames} onChange={(e) => onChange({ motherNames: e.target.checked })} />
              Show spouses on the branch
            </label>
          </section>

          <section className="space-y-1.5">
            <h4 className="section-title">Ornaments</h4>
            {(
              [
                ["frame", theme.preset === "luxe" ? "Gold-foil frame (the artwork)" : "The design's frame"],
                ["femaleCapsule", "Daughters as gold capsules"],
                ["branchColors", isInkOnly(theme) ? "Mark each main branch with its own line pattern" : "Colour each main branch (lineage colours)"],
                ["branchTint", "A faint wash behind each main branch"],
                ["bismillah", "Basmala header ﷽"],
                ["edition", "Edition year under the title (طبعة …)"],
                ["verse", "Verse medallion (الحجرات ١٣)"],
                ["hadith", "Hadith medallion (تعلموا من أنسابكم)"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!theme[key]} onChange={(e) => onChange({ [key]: e.target.checked })} />
                {label}
              </label>
            ))}
            {theme.frame && frameAvailable && theme.preset === "luxe" && (
              <label className="flex items-center justify-between text-sm" title="Softer: the gold ornament and the paper's texture quieter, so the tree comes first">
                Frame finish
                <select className="input w-48" value={theme.frameFinish ?? "full"} onChange={(e) => onChange({ frameFinish: e.target.value as PosterTheme["frameFinish"] })}>
                  <option value="full">Full gold</option>
                  <option value="soft">Softer</option>
                </select>
              </label>
            )}
            {theme.frame && !frameAvailable && theme.preset === "luxe" && (
              <p className="rounded bg-amber-50 px-2 py-1 text-xs text-amber-800">
                Frame artwork not found. Save the Canva frame as{" "}
                <code>public/poster-frame.jpg</code> (or <code>.png</code>); until then a fine gold rule frames it.
              </p>
            )}
          </section>

          <section className="space-y-1.5">
            <h4 className="section-title">Soil inscription</h4>
            <p className="text-xs text-gray-500">
              Leave empty to inscribe the ancestors older than the trunk. Or paste the lineage exactly as
              your source writes it.
            </p>
            <textarea
              className="input min-h-[70px] font-naskh text-base"
              dir="auto"
              value={soilDraft}
              onChange={(e) => setSoilDraft(e.target.value)}
              onBlur={() => {
                const next = soilDraft.trim() || null;
                if (next !== (soilText ?? null)) onSoilTextChange(next);
              }}
            />
          </section>
        </div>
      )}
    </div>
  );
}
