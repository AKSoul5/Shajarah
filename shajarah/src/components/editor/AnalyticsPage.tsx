"use client";

// The family in figures (src/lib/family/analytics.ts). Plain bars in the
// app's own ink, every one labelled directly; every figure that rests on
// partly recorded years says how many people it covers.

import { useMemo } from "react";
import { familyFigures, type Coverage } from "@/lib/family/analytics";
import type { FamilyIndex } from "@/lib/family/index";
import { useLanguage } from "@/lib/i18n";
import type { TreeDTO } from "@/lib/types";

function Card({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-lg border border-parchment-300 bg-white px-4 py-3">
      <div className="text-2xl font-semibold tabular-nums text-bark-900">{value}</div>
      <div className="text-xs text-bark-500">{label}</div>
      {note && <div className="mt-0.5 text-[11px] text-bark-400">{note}</div>}
    </div>
  );
}

/** Horizontal bars: a label, the bar, the value. */
function Bars({ rows, onPick }: { rows: { key: string; label: string; value: number; note?: string; naskh?: boolean }[]; onPick?: (key: string) => void }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="space-y-1">
      {rows.map((r) => (
        <div key={r.key} className="grid grid-cols-[9rem_1fr_3.5rem] items-center gap-2 text-sm">
          {onPick ? (
            <button type="button" onClick={() => onPick(r.key)} className={`truncate text-start hover:underline ${r.naskh ? "font-naskh text-[15px]" : ""}`} dir="auto">{r.label}</button>
          ) : <span className={`truncate ${r.naskh ? "font-naskh text-[15px]" : ""}`} dir="auto">{r.label}</span>}
          <span className="h-3 overflow-hidden rounded-sm bg-parchment-100">
            <span className="block h-full rounded-sm bg-bark-500" style={{ width: `${(r.value / max) * 100}%` }} />
          </span>
          <span className="text-end text-xs tabular-nums text-bark-700" title={r.note}>{r.note ?? r.value}</span>
        </div>
      ))}
    </div>
  );
}

/** Columns by decade (years run left to right in both languages). */
function Decades({ data, n }: { data: { decade: number; count: number }[]; n: (v: number) => string }) {
  if (!data.length) return null;
  const max = Math.max(...data.map((d) => d.count));
  const W = Math.max(data.length * 34, 200), H = 120;
  const bw = W / data.length;
  return (
    <div className="overflow-x-auto" dir="ltr">
      <svg viewBox={`0 0 ${W} ${H + 34}`} className="h-auto w-full max-w-3xl" role="img">
        {data.map((d, i) => {
          const h = (d.count / max) * H;
          return (
            <g key={d.decade}>
              <rect x={i * bw + 4} y={H - h} width={bw - 8} height={h} rx={2} className="fill-bark-500" />
              <text x={i * bw + bw / 2} y={H - h - 4} textAnchor="middle" fontSize={11} className="fill-bark-700">{n(d.count)}</text>
              <text x={i * bw + bw / 2} y={H + 16} textAnchor="middle" fontSize={10} className="fill-bark-500">{d.decade}s</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function Section({ title, coverage, children }: { title: string; coverage?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-parchment-300 bg-white p-4">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-bark-500">{title}</h3>
      {coverage && <p className="mb-2 text-xs text-bark-400">{coverage}</p>}
      <div className="mt-2">{children}</div>
    </section>
  );
}

export function AnalyticsPage({ ix, tree, onOpenMember }: { ix: FamilyIndex; tree: Pick<TreeDTO, "marriages" | "citations">; onOpenMember: (id: string) => void }) {
  const { t, n } = useLanguage();
  const f = useMemo(() => familyFigures(ix, tree), [ix, tree]);
  const cover = (c: Coverage) => t("analytics.coverage", { known: n(c.known), of: n(c.of), pct: n(c.of ? Math.round((c.known / c.of) * 100) : 0) });
  const o = f.overview;
  return (
    <div className="h-full overflow-auto bg-parchment-50">
      <div className="mx-auto max-w-5xl space-y-5 p-6">
        <header>
          <h2 className="text-xl font-semibold text-bark-900">{t("analytics.title")}</h2>
          <p className="mt-1 text-sm text-bark-500">{t("analytics.intro")}</p>
        </header>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card label={t("analytics.people")} value={n(o.people)} note={t("analytics.peopleNote", { blood: n(o.bloodRelatives), married: n(o.marriedIn) })} />
          <Card label={t("analytics.generations")} value={n(o.generations)} note={f.ancestorsAbove ? t("analytics.ancestorsAbove", { n: n(f.ancestorsAbove) }) : undefined} />
          <Card label={t("analytics.branches")} value={n(o.branches)} />
          <Card label={t("analytics.families")} value={n(o.families)} note={t("analytics.familiesNote")} />
          <Card label={t("analytics.men")} value={n(o.men)} />
          <Card label={t("analytics.women")} value={n(o.women)} note={o.genderUnknown ? t("analytics.genderUnknown", { n: n(o.genderUnknown) }) : undefined} />
          <Card label={t("analytics.deceased")} value={n(o.recordedDeceased)} />
          <Card label={t("analytics.notDeceased")} value={n(o.notRecordedDeceased)} note={t("analytics.notDeceasedNote")} />
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <Section title={t("analytics.byGeneration")}>
            <Bars rows={f.byGeneration.map((g) => ({ key: String(g.level), label: t("filter.generationN", { n: n(g.level) }), value: g.people, note: `${n(g.people)}` }))} />
          </Section>
          <Section title={t("analytics.branchSizes")}>
            <Bars onPick={onOpenMember} rows={f.branches.map((b) => ({ key: b.id, label: b.name, value: b.people, naskh: true, note: n(b.people) }))} />
          </Section>
        </div>

        <Section title={t("analytics.births")} coverage={cover(f.birthCoverage)}>
          {f.birthsByDecade.length ? <Decades data={f.birthsByDecade} n={n} /> : <p className="text-sm text-bark-500">{t("analytics.noYears")}</p>}
        </Section>
        <div className="grid gap-5 md:grid-cols-2">
          <Section title={t("analytics.deaths")} coverage={cover(f.deathCoverage)}>
            {f.deathsByDecade.length ? <Decades data={f.deathsByDecade} n={n} /> : <p className="text-sm text-bark-500">{t("analytics.noYears")}</p>}
          </Section>
          <Section title={t("analytics.lifespans")} coverage={cover(f.lifespanCoverage)}>
            {f.lifespans.length ? (
              <Bars rows={f.lifespans.map((d) => ({ key: String(d.decade), label: t("analytics.ageRange", { from: n(d.decade), to: n(d.decade + 9) }), value: d.count, note: n(d.count) }))} />
            ) : <p className="text-sm text-bark-500">{t("analytics.noYears")}</p>}
          </Section>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          <Section title={t("analytics.namesMen")}>
            <Bars rows={f.topNames.men.map((x) => ({ key: x.name, label: x.name, value: x.count, naskh: true, note: n(x.count) }))} />
          </Section>
          <Section title={t("analytics.namesWomen")}>
            <Bars rows={f.topNames.women.map((x) => ({ key: x.name, label: x.name, value: x.count, naskh: true, note: n(x.count) }))} />
          </Section>
          <Section title={t("analytics.marriages")}>
            <dl className="space-y-1 text-sm">
              <div className="flex justify-between"><dt>{t("analytics.marriagesTotal")}</dt><dd className="tabular-nums">{n(f.marriages.total)}</dd></div>
              <div className="flex justify-between"><dt>{t("analytics.marriagesWithYear")}</dt><dd className="tabular-nums">{n(f.marriages.withYear)}</dd></div>
              <div className="flex justify-between"><dt>{t("analytics.severalMarriages")}</dt><dd className="tabular-nums">{n(f.marriages.severalMarriages)}</dd></div>
              <div className="flex justify-between"><dt>{t("analytics.withinFamily")}</dt><dd className="tabular-nums">{n(f.marriages.withinFamily)}</dd></div>
            </dl>
          </Section>
        </div>

        <Section title={t("analytics.oldestLiving")} coverage={t("analytics.oldestLivingNote")}>
          {f.oldestLiving.length ? (
            <ul className="flex flex-wrap gap-1">
              {f.oldestLiving.map((p) => (
                <li key={p.id}>
                  <button type="button" onClick={() => onOpenMember(p.id)} className="rounded-full border border-parchment-300 px-2 py-0.5 text-start hover:border-bark-400">
                    <span className="font-naskh text-[15px]" dir="auto">{p.name}</span>{" "}
                    <span className="text-[11px] text-bark-400">{t("analytics.bornAge", { born: p.born, age: n(p.age) })}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-bark-500">{t("analytics.noYears")}</p>}
        </Section>
        <p className="text-xs text-bark-400">{t("analytics.footnote")}</p>
      </div>
    </div>
  );
}
