"use client";

import { SOIL_STYLE_ORDER } from "@/lib/layout/soil";
import { memo, useState } from "react";
import { useDismiss } from "../useDismiss";
import { useLanguage } from "@/lib/i18n";
import type { SoilStyleId } from "@/lib/layout/soil";
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
  const { t: tr } = useLanguage();
  const designName = (p: ThemePreset) => tr(`design.${p}.name` as const);
  const soilName = (id: SoilStyleId) => tr(`soilStyle.${id}.name` as const);
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
        <Icon name="palette" className="me-1.5 h-4 w-4" />{tr("style.button")}
      </button>
      {open && (
        <div className="absolute end-0 z-30 mt-2 max-h-[80vh] w-[36rem] max-w-[calc(100vw-2rem)] space-y-4 overflow-auto rounded-lg border border-parchment-300 bg-white p-4 shadow-xl">
          <section>
            <h4 className="section-title">{tr("style.design")}</h4>
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
                        {on && <span aria-hidden className="text-bark-700">✓</span>}{designName(p)}
                      </span>
                      <span className="block text-[11px] leading-snug text-bark-500">{tr(`design.${p}.desc` as const)}</span>
                    </span>
                  </button>
                );
              })}
            </div>
            {Object.keys(compactTheme(theme)).some((k) => ["male", "female", "ancestor", "branch", "background", "metallic", "nodeRim", "inkOnly"].includes(k)) && (
              <button type="button" className="btn-outline mt-2 w-full justify-center text-sm" onClick={() => onChange(resetDesign(theme))}
                title={tr("style.resetTitle")}>
                {tr("style.reset", { design: designName(theme.preset) })}
              </button>
            )}
          </section>

          <section className="space-y-1.5">
            <h4 className="section-title">{tr("style.colours")}</h4>
            {color("male", tr("style.male"))}
            {color("female", tr("style.female"))}
            {color("ancestor", tr("style.ancestor"))}
            {color("branch", tr("style.branch"))}
            <label className="flex items-center justify-between text-sm">
              {tr("style.colourBy")}
              <select className="input w-48" value={theme.colorBy} onChange={(e) => onChange({ colorBy: e.target.value as PosterTheme["colorBy"] })}>
                <option value="gender">{tr("style.byGender")}</option>
                <option value="generation">{tr("style.byGeneration")}</option>
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={theme.metallic} onChange={(e) => onChange({ metallic: e.target.checked })} />
              {tr("style.metallic")}
            </label>
            <label className="flex items-center gap-2 text-sm" title={tr("style.inkOnlyTitle")}>
              <input type="checkbox" checked={isInkOnly(theme)} onChange={(e) => onChange({ inkOnly: e.target.checked })} />
              {tr("style.inkOnly")}
            </label>
          </section>

          <section>
            <h4 className="section-title">{tr("style.foundation")}</h4>
            <p className="mb-1.5 text-xs text-gray-500">{tr("style.foundationNote")}</p>
            <div className="grid grid-cols-3 gap-2" role="group" aria-label={tr("style.foundationStyle")}>
              {SOIL_STYLE_ORDER.map((id) => {
                const on = theme.soilStyle === id;
                const recommended = THEME_PRESETS[theme.preset].soilStyle === id;
                return (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => onChange({ soilStyle: id })}
                    title={tr(`soilStyle.${id}.desc` as const)}
                    className={`overflow-hidden rounded-lg border text-start transition-shadow hover:shadow-md ${
                      on ? "border-bark-700 ring-2 ring-bark-700/40" : "border-parchment-300"
                    }`}
                  >
                    <span aria-hidden className="block aspect-[4/3] overflow-hidden bg-parchment-50">
                      <SoilPreview style={id} theme={theme} rtl={layout?.rtl ?? true} idPrefix={`sp-${id}`} className="pointer-events-none block h-full w-full" />
                    </span>
                    <span className="block px-1.5 py-1">
                      <span className="flex items-center gap-1 text-xs font-semibold text-bark-900">
                        {on && <span aria-hidden className="text-bark-700">✓</span>}{soilName(id)}
                      </span>
                      <span className="block text-[10px] leading-snug text-bark-500">
                        {tr(`soilStyle.${id}.desc` as const)}{recommended ? tr("style.suggestedFor", { design: designName(theme.preset) }) : ""}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
            {theme.soilStyle !== THEME_PRESETS[theme.preset].soilStyle && (
              <button type="button" className="btn-outline mt-2 w-full justify-center text-sm" onClick={() => onChange({ soilStyle: THEME_PRESETS[theme.preset].soilStyle })}>
                {tr("style.useFoundation", { design: designName(theme.preset), foundation: soilName(THEME_PRESETS[theme.preset].soilStyle) })}
              </button>
            )}
          </section>

          <section className="space-y-1.5">
            <h4 className="section-title">{tr("style.nodes")}</h4>
            <label className="flex items-center justify-between text-sm">
              {tr("style.shape")}
              <select className="input w-48" value={theme.nodeShape} onChange={(e) => onChange({ nodeShape: e.target.value as PosterTheme["nodeShape"] })}>
                <option value="auto">{tr("style.shape.auto")}</option>
                <option value="leaf">{tr("style.shape.leaf")}</option>
                <option value="circle">{tr("style.shape.circle")}</option>
                <option value="oval">{tr("style.shape.oval")}</option>
              </select>
            </label>
            <label className="flex items-center justify-between text-sm">
              {tr("style.label")}
              <select className="input w-48" value={theme.labelMode} onChange={(e) => onChange({ labelMode: e.target.value as PosterTheme["labelMode"] })}>
                <option value="name">{tr("style.label.name")}</option>
                <option value="withFather">{tr("style.label.withFather")}</option>
              </select>
            </label>
            <label className="flex items-center justify-between text-sm">
              {tr("style.trunk")}
              <select className="input w-48" value={theme.trunkStyle} onChange={(e) => onChange({ trunkStyle: e.target.value as PosterTheme["trunkStyle"] })}>
                <option value="carved">{tr("style.trunk.carved")}</option>
                <option value="badges">{tr("style.trunk.badges")}</option>
              </select>
            </label>
            <label className="flex items-center justify-between text-sm" title={tr("style.spousesTitle")}>
              {tr("style.spouses")}
              <select className="input w-48" value={theme.spouseStyle} onChange={(e) => onChange({ spouseStyle: e.target.value as PosterTheme["spouseStyle"] })}>
                <option value="manuscript">{tr("style.spouse.manuscript")}</option>
                <option value="capsule">{tr("style.spouse.capsule")}</option>
                <option value="inscribed">{tr("style.spouse.inscribed")}</option>
              </select>
            </label>
            <label className="flex items-center justify-between text-sm" title={tr("style.foundationNamesTitle")}>
              {tr("style.foundationNames")}
              <select className="input w-48" value={theme.soilShorten ? "shorten" : "all"} onChange={(e) => onChange({ soilShorten: e.target.value === "shorten" })}>
                <option value="all">{tr("style.foundationNames.all")}</option>
                <option value="shorten">{tr("style.foundationNames.shorten")}</option>
              </select>
            </label>
            <label className="flex items-center justify-between text-sm">
              {tr("style.paper")}
              <select className="input w-48" value={theme.background} onChange={(e) => onChange({ background: e.target.value as PosterTheme["background"], inkOnly: isInkOnly(theme) })}>
                <option value="parchment">{tr("style.paper.own")}</option>
                <option value="white">{tr("style.paper.white")}</option>
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={theme.showYears} onChange={(e) => onChange({ showYears: e.target.checked })} />
              {tr("style.years")}
            </label>
            <label className="flex items-center gap-2 text-sm" title={tr("style.spousesOnBranchTitle")}>
              <input type="checkbox" checked={theme.motherNames} onChange={(e) => onChange({ motherNames: e.target.checked })} />
              {tr("style.spousesOnBranch")}
            </label>
          </section>

          <section className="space-y-1.5">
            <h4 className="section-title">{tr("style.ornaments")}</h4>
            {(
              [
                ["frame", tr(theme.preset === "luxe" ? "style.orn.frameLuxe" : "style.orn.frame")],
                ["femaleCapsule", tr("style.orn.femaleCapsule")],
                ["branchColors", tr("style.orn.branchColors")],
                ["branchTint", tr("style.orn.branchTint")],
                ["bismillah", tr("style.orn.bismillah")],
                ["edition", tr("style.orn.edition")],
                ["verse", tr("style.orn.verse")],
                ["hadith", tr("style.orn.hadith")],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!theme[key]} onChange={(e) => onChange({ [key]: e.target.checked })} />
                {label}
              </label>
            ))}
            {theme.frame && frameAvailable && theme.preset === "luxe" && (
              <label className="flex items-center justify-between text-sm" title={tr("style.frameFinishTitle")}>
                {tr("style.frameFinish")}
                <select className="input w-48" value={theme.frameFinish ?? "full"} onChange={(e) => onChange({ frameFinish: e.target.value as PosterTheme["frameFinish"] })}>
                  <option value="full">{tr("style.frameFinish.full")}</option>
                  <option value="soft">{tr("style.frameFinish.soft")}</option>
                </select>
              </label>
            )}
            {theme.frame && !frameAvailable && theme.preset === "luxe" && (
              <p className="rounded bg-amber-50 px-2 py-1 text-xs text-amber-800">
                {(() => { const [before, after] = tr("style.frameMissing").split("{file}"); return <>{before}<code>public/poster-frame.jpg</code>{after}</>; })()}
              </p>
            )}
          </section>

          <section className="space-y-1.5">
            <h4 className="section-title">{tr("style.soil")}</h4>
            <p className="text-xs text-gray-500">{tr("style.soilNote")}</p>
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
