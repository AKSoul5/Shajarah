"use client";

// Charts and reports for one person, from the family engine: the
// pedigree (their ancestors as a chart), the Ahnentafel (their ancestors
// numbered by the standard convention) and their family group sheets.
// Changing the format or the person changes nothing in the records.
// Each can be printed or saved as PDF; the pedigree also as SVG.

import { useMemo, useRef, useState } from "react";
import { nasabIn, type FamilyIndex } from "@/lib/family/index";
import { ahnentafel, descendantTree, familyRegister, groupSheets, pedigree, timeline, type PedigreeNode } from "@/lib/family/reports";
import { RadialTree, Timeline } from "./TimelineRadial";
import type { MarriageDTO } from "@/lib/types";
import { BowtieChart, FanChart, HourglassChart } from "./MoreCharts";
import { generationText } from "@/lib/family/generations";
import { useLanguage } from "@/lib/i18n";
import type { MemberDTO } from "@/lib/types";

type Format = "pedigree" | "fan" | "hourglass" | "bowtie" | "radial" | "ahnentafel" | "groupSheet" | "timeline" | "register";
const GRAPHICAL: readonly Format[] = ["pedigree", "fan", "hourglass", "bowtie", "radial"];

const years = (m: MemberDTO | null | undefined) =>
  !m ? "" : m.birthYear || m.deathYear ? `${m.birthYear ?? "?"}–${m.deathYear ?? (m.isDeceased ? "?" : "")}` : "";

/** Opens the chart alone on a page of its own and asks the browser to print it (or save it as PDF). */
function printAlone(title: string, html: string, dir: "ltr" | "rtl") {
  const w = window.open("", "_blank", "width=1100,height=800");
  if (!w) return;
  w.document.write(`<!doctype html><html dir="${dir}"><head><meta charset="utf-8"><title>${title.replace(/</g, "&lt;")}</title>
<style>
  body { font-family: Amiri, 'Traditional Arabic', 'Times New Roman', serif; color: #2a1c0c; margin: 18mm; }
  h1 { font-size: 18pt; margin: 0 0 4mm; } h2 { font-size: 13pt; margin: 6mm 0 2mm; }
  table { border-collapse: collapse; width: 100%; font-size: 11pt; } td, th { border-bottom: 0.3mm solid #d9c493; padding: 1.5mm 2mm; text-align: start; vertical-align: top; }
  th { font-weight: normal; color: #6b4423; font-size: 9pt; } svg { width: 100%; height: auto; } .muted { color: #7d5f45; font-size: 9pt; }
  @page { size: auto; margin: 12mm; }
</style></head><body>${html}<script>window.onload = () => { window.focus(); window.print(); };</script></body></html>`);
  w.document.close();
}

function PedigreeChart({ rows, rtl, onPick, t }: { rows: PedigreeNode[][]; rtl: boolean; onPick: (id: string) => void; t: ReturnType<typeof useLanguage>["t"] }) {
  const G = rows.length;
  const BW = 210, BH = 46, GAP = 46, VG = 10;
  const leaves = 2 ** (G - 1);
  const H = leaves * (BH + VG);
  const W = G * BW + (G - 1) * GAP;
  const xOf = (g: number) => (rtl ? W - (g + 1) * BW - g * GAP : g * (BW + GAP));
  const yOf = (g: number, i: number) => {
    const span = H / 2 ** g;
    return i * span + span / 2 - BH / 2;
  };
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={t("charts.pedigree")} xmlns="http://www.w3.org/2000/svg" fontFamily="Amiri, 'Traditional Arabic', serif">
      {rows.map((row, g) => row.map((n, i) => {
        if (g === 0) return null;
        const parentIdx = Math.floor(i / 2);
        const x1 = rtl ? xOf(g - 1) : xOf(g - 1) + BW, y1 = yOf(g - 1, parentIdx) + BH / 2;
        const x2 = rtl ? xOf(g) + BW : xOf(g), y2 = yOf(g, i) + BH / 2;
        const mx = (x1 + x2) / 2;
        return <path key={`l${g}-${i}`} d={`M${x1} ${y1}H${mx}V${y2}H${x2}`} fill="none" stroke={n.person ? "#6b4423" : "#d9c493"} strokeWidth={1.2} strokeDasharray={n.person ? undefined : "3 3"} />;
      }))}
      {rows.map((row, g) => row.map((n, i) => {
        const x = xOf(g), y = yOf(g, i);
        return (
          <g key={`b${g}-${i}`} onClick={n.person ? () => onPick(n.person!.id) : undefined} style={n.person ? { cursor: "pointer" } : undefined}>
            <rect x={x} y={y} width={BW} height={BH} rx={6} fill={n.person ? "#fbf7ee" : "none"} stroke={n.person ? "#b08a2e" : "#e9dcbb"} strokeDasharray={n.person ? undefined : "4 3"} />
            <text x={x + BW / 2} y={y + (n.person ? 20 : 28)} textAnchor="middle" fontSize={n.person ? 16 : 11} fill={n.person ? "#2a1c0c" : "#b9a27a"}>
              {n.person ? n.person.name : t("kin.notRecorded")}
            </text>
            {n.person && <text x={x + BW / 2} y={y + 37} textAnchor="middle" fontSize={10} fill="#7d5f45">{[years(n.person), `#${n.number}`].filter(Boolean).join(" · ")}</text>}
          </g>
        );
      }))}
    </svg>
  );
}

export function ChartsPage({ ix, marriages, sources, subjectId, onOpenMember }: {
  ix: FamilyIndex; marriages: readonly MarriageDTO[]; subjectId: string | null; onOpenMember: (id: string) => void;
  sources: { sources: readonly { id: string; title: string }[]; citations: readonly { sourceId: string; memberId: string }[] };
}) {
  const { t, n, lang, dir } = useLanguage();
  const [format, setFormat] = useState<Format>("pedigree");
  const [generations, setGenerations] = useState(4);
  const subject = ix.get(subjectId ?? ix.referenceId);
  const box = useRef<HTMLDivElement>(null);
  const rows = useMemo(() => (subject ? pedigree(ix, subject.id, generations) : []), [ix, subject, generations]);
  const entries = useMemo(() => (subject ? ahnentafel(ix, subject.id, Math.max(generations, 2)) : []), [ix, subject, generations]);
  const sheets = useMemo(() => (subject ? groupSheets(ix, subject.id) : []), [ix, subject]);
  const below = useMemo(() => (subject && format === "hourglass" ? descendantTree(ix, subject.id, 3) : null), [ix, subject, format]);
  const radial = useMemo(() => (subject && format === "radial" ? descendantTree(ix, subject.id, Math.min(generations, 5)) : null), [ix, subject, format, generations]);
  const register = useMemo(() => (subject && format === "register" ? familyRegister(ix, sources, subject.id, Math.max(generations, 3)) : []), [ix, sources, subject, format, generations]);
  // the timeline: the whole family, or the main branch the person belongs to
  const [wholeFamily, setWholeFamily] = useState(true);
  const events = useMemo(() => {
    if (format !== "timeline") return null;
    const branch = subject ? ix.branchesOf(subject.id)[0] : undefined;
    const among = !wholeFamily && branch ? new Set([branch.id, ...ix.descendants(branch.id)]) : undefined;
    return timeline(ix, marriages, among);
  }, [format, ix, marriages, subject, wholeFamily]);
  const title = subject ? `${t(`charts.${format}`)}: ${nasabIn(ix, subject.id, 2)}` : "";

  const download = () => {
    const svg = box.current?.querySelector("svg");
    if (!svg) return;
    const blob = new Blob([`<?xml version="1.0" encoding="UTF-8"?>\n${svg.outerHTML}`], { type: "image/svg+xml" });
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `${title.replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim()}.svg` });
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const print = () => box.current && printAlone(title, `<h1>${title.replace(/</g, "&lt;")}</h1>${box.current.innerHTML}`, dir);

  const Name = ({ m }: { m: MemberDTO | null | undefined }) =>
    m ? <button type="button" className="font-naskh text-[15px] hover:underline" dir="auto" onClick={() => onOpenMember(m.id)}>{m.name}</button> : <span className="text-bark-400">{t("kin.notRecorded")}</span>;

  return (
    <div className="h-full overflow-auto bg-parchment-50">
      <div className="mx-auto max-w-6xl space-y-4 p-6">
        <header className="flex flex-wrap items-end gap-4">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold text-bark-900">{t("charts.title")}</h2>
            <p className="text-sm text-bark-500">
              {subject ? <>{t("charts.for")} <span className="font-naskh text-base" dir="auto">{nasabIn(ix, subject.id, 3)}</span> · {generationText(ix.generations.get(subject.id), lang, subject.gender)}</> : t("charts.choose")}
            </p>
            <p className="text-xs text-bark-400">{t("charts.howToChoose")}</p>
          </div>
          <div role="tablist" className="ms-auto inline-flex overflow-hidden rounded-md border border-parchment-300 text-sm">
            {(["pedigree", "fan", "hourglass", "bowtie", "radial", "ahnentafel", "groupSheet", "timeline", "register"] as const).map((f) => (
              <button key={f} type="button" role="tab" aria-selected={format === f} onClick={() => setFormat(f)}
                className={`px-3 py-1 ${format === f ? "bg-bark-700 text-parchment-50" : "bg-white text-bark-700 hover:bg-parchment-50"}`}>
                {t(`charts.${f}`)}
              </button>
            ))}
          </div>
          {format === "timeline" && (
            <label className="flex items-center gap-2 text-sm text-bark-700">
              <input type="checkbox" checked={!wholeFamily} onChange={(e) => setWholeFamily(!e.target.checked)} disabled={!subject || !ix.branchesOf(subject.id).length} />
              {t("charts.branchOnly")}
            </label>
          )}
          {format !== "groupSheet" && format !== "timeline" && (
            <label className="flex items-center gap-2 text-sm text-bark-700">
              {t("charts.generations")}
              <select className="input h-8 px-2" value={generations} onChange={(e) => setGenerations(Number(e.target.value))}>
                {[3, 4, 5, 6].map((g) => <option key={g} value={g}>{n(g)}</option>)}
              </select>
            </label>
          )}
          <div className="flex gap-2">
            {GRAPHICAL.includes(format) && <button type="button" className="btn-outline text-sm" onClick={download} disabled={!subject}>{t("charts.svg")}</button>}
            <button type="button" className="btn-outline text-sm" onClick={print} disabled={!subject}>{t("charts.print")}</button>
          </div>
        </header>

        {subject && (
          <div ref={box} className="rounded-lg border border-parchment-300 bg-white p-4">
            {format === "pedigree" && <PedigreeChart rows={rows} rtl={dir === "rtl"} onPick={onOpenMember} t={t} />}
            {format === "fan" && <FanChart rows={rows} rtl={dir === "rtl"} onPick={onOpenMember} notRecorded={t("kin.notRecorded")} />}
            {format === "hourglass" && <HourglassChart rows={rows} below={below} onPick={onOpenMember} notRecorded={t("kin.notRecorded")} />}
            {format === "radial" && <RadialTree root={radial} onPick={onOpenMember} />}
            {format === "timeline" && events && (
              <div className="space-y-3">
                <p className="text-xs text-bark-400">{t("charts.timelineNote", { n: n(events.undatedBirths) })}</p>
                {events.events.length ? (
                  <Timeline events={events.events} onPick={onOpenMember} label={(e) => t(`charts.event.${e.kind}`)} />
                ) : <p className="text-sm text-bark-500">{t("analytics.noYears")}</p>}
              </div>
            )}
            {format === "register" && (
              <article className="space-y-5">
                <p className="text-xs text-bark-400">{t("charts.registerNote")}</p>
                {[...new Set(register.map((e) => e.generation))].map((gen) => (
                  <section key={gen} className="space-y-4">
                    <h3 className="border-b border-parchment-300 pb-1 text-base font-semibold text-bark-900">{t("charts.registerGeneration", { n: n(gen) })}</h3>
                    {register.filter((e) => e.generation === gen).map((e) => (
                      <div key={e.number} className="space-y-1 text-sm leading-relaxed">
                        <p>
                          <span className="me-2 font-semibold tabular-nums">{n(e.number)}.</span>
                          <Name m={e.person} />
                          {e.line.length > 0 && <span className="text-xs text-bark-400"> ({e.line.map(n).join(" › ")})</span>}
                          {years(e.person) && <span className="text-bark-500"> · {years(e.person)}</span>}
                          {e.spouses.length > 0 && <span> · {t("charts.married")} {e.spouses.map((s, k) => <span key={s.person.id}>{k > 0 && t("list.separator")}<Name m={s.person} />{s.marriage.startYear ? ` (${s.marriage.startYear})` : ""}</span>)}</span>}
                        </p>
                        {e.person.notes && <p className="whitespace-pre-line ps-6 text-bark-700" dir="auto">{e.person.notes}</p>}
                        {e.children.length > 0 && (
                          <div className="ps-6">
                            <p className="text-xs text-bark-500">{t("row.children", { n: n(e.children.length) })}</p>
                            <ol className="space-y-0.5">
                              {e.children.map((c) => (
                                <li key={c.person.id} className="flex gap-2">
                                  <span className="w-5 shrink-0 text-center">{c.number ? "+" : ""}</span>
                                  <span className="w-8 shrink-0 text-bark-500">{c.roman}.</span>
                                  <span><Name m={c.person} />{years(c.person) && <span className="text-bark-500"> · {years(c.person)}</span>}{c.number ? <span className="text-xs text-bark-400"> → {n(c.number)}</span> : null}</span>
                                </li>
                              ))}
                            </ol>
                          </div>
                        )}
                        {e.sources.length > 0 && <p className="ps-6 text-xs text-bark-500">{t("charts.sources")}: {e.sources.join(t("list.separator"))}</p>}
                      </div>
                    ))}
                  </section>
                ))}
              </article>
            )}
            {format === "bowtie" && <BowtieChart rows={rows} rtl={dir === "rtl"} onPick={onOpenMember} notRecorded={t("kin.notRecorded")} />}

            {format === "ahnentafel" && (
              <table className="w-full text-sm">
                <thead><tr className="text-xs text-bark-500"><th className="pb-2 text-start font-normal">{t("charts.number")}</th><th className="pb-2 text-start font-normal">{t("charts.name")}</th><th className="pb-2 text-start font-normal">{t("charts.relation")}</th><th className="pb-2 text-start font-normal">{t("charts.years")}</th></tr></thead>
                <tbody>
                  {entries.map((e) => (
                    <tr key={e.number} className="border-t border-parchment-100">
                      <td className="py-1 tabular-nums">{n(e.number)}{e.alsoNumbers.length ? <span className="text-xs text-bark-400"> ({t("charts.also", { n: e.alsoNumbers.map(n).join(t("list.separator")) })})</span> : null}</td>
                      <td className="py-1"><Name m={e.person} /></td>
                      <td className="py-1 text-bark-500">{e.number === 1 ? t("charts.subject") : t(e.number % 2 === 0 ? "charts.fatherOfN" : "charts.motherOfN", { n: n(Math.floor(e.number / 2)) })}</td>
                      <td className="py-1 tabular-nums text-bark-500">{years(e.person)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {format === "groupSheet" && (sheets.length === 0 ? <p className="text-sm text-bark-500">{t("charts.noFamily")}</p> : (
              <div className="space-y-6">
                {sheets.map((s, i) => (
                  <section key={i}>
                    <h3 className="mb-2 font-semibold text-bark-900">{t("charts.sheetN", { n: n(i + 1), of: n(sheets.length) })}</h3>
                    <table className="w-full text-sm">
                      <tbody>
                        {([["charts.husband", s.husband, s.husbandParents], ["charts.wife", s.wife, s.wifeParents]] as const).map(([label, p, parents]) => (
                          <tr key={label} className="border-t border-parchment-100">
                            <th className="w-32 py-1.5 text-start align-top text-xs font-normal text-bark-500">{t(label)}</th>
                            <td className="py-1.5">
                              <Name m={p} /> <span className="text-xs text-bark-400">{years(p)}</span>
                              {p && <div className="text-xs text-bark-500">{t("row.father")}: <Name m={parents.father} /> · {t("row.mother")}: <Name m={parents.mother} /></div>}
                            </td>
                          </tr>
                        ))}
                        <tr className="border-t border-parchment-100">
                          <th className="py-1.5 text-start text-xs font-normal text-bark-500">{t("charts.marriage")}</th>
                          <td className="py-1.5">{s.marriage ? (s.marriage.startYear ? `${s.marriage.startYear}${s.marriage.endYear ? `–${s.marriage.endYear}` : ""}` : t("charts.marriageNoYear")) : t("charts.noMarriage")}</td>
                        </tr>
                        <tr className="border-t border-parchment-100">
                          <th className="py-1.5 text-start align-top text-xs font-normal text-bark-500">{t("row.children", { n: n(s.children.length) })}</th>
                          <td className="py-1.5">
                            {s.children.length === 0 ? <span className="text-bark-400">{t("kin.noneRecorded")}</span> : (
                              <ol className="list-decimal space-y-0.5 ps-5">
                                {s.children.map((c) => (
                                  <li key={c.person.id}>
                                    <Name m={c.person} /> <span className="text-xs text-bark-400">{years(c.person)}</span>
                                    {c.spouses.length > 0 && <span className="text-xs text-bark-500"> · {t("charts.married")} {c.spouses.map((x, k) => <span key={x.id}>{k > 0 && t("list.separator")}<Name m={x} /></span>)}</span>}
                                  </li>
                                ))}
                              </ol>
                            )}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </section>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
