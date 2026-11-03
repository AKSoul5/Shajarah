"use client";

// The family's records at a glance (src/lib/family/quality.ts): how
// complete each main branch is, what cannot be right, what is worth a
// look, and what is not recorded, each with the people concerned. It only
// reports: every correction is the family's to make, in the person's own
// record (choosing a name opens it).

import { useMemo, useState } from "react";
import { nasabIn, type FamilyIndex } from "@/lib/family/index";
import { branchMembers, completenessOf, findings, type Finding, type FindingKind, type FieldArea } from "@/lib/family/quality";
import type { TreeDTO } from "@/lib/types";
import { useLanguage } from "@/lib/i18n";
import type { MessageKey } from "@/lib/messages";

const AREAS: FieldArea[] = ["personal", "relationships", "history"];
const LEVELS = [
  { level: "confirmed" as const, tone: "border-red-200 bg-red-50 text-red-900" },
  { level: "possible" as const, tone: "border-amber-200 bg-amber-50 text-amber-900" },
  { level: "missing" as const, tone: "border-parchment-300 bg-white text-bark-900" },
];

const pct = (x: number) => `${Math.round(x * 100)}%`;

function Bar({ share }: { share: number }) {
  return (
    <span className="inline-flex w-full items-center gap-2">
      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-parchment-200">
        <span className="block h-full rounded-full bg-bark-500" style={{ width: pct(share) }} />
      </span>
      <span className="w-9 text-end tabular-nums">{pct(share)}</span>
    </span>
  );
}

export function RecordsPage({ ix, tree, onOpenMember }: { ix: FamilyIndex; tree: Pick<TreeDTO, "citations">; onOpenMember: (id: string) => void }) {
  const { t, n } = useLanguage();
  const title = (f: Finding) => t((f.level === "missing" ? `missing.${f.kind}` : `issue.${f.kind}`) as MessageKey);
  const levelText = { confirmed: ["records.confirmed", "records.confirmedNote"], possible: ["records.possible", "records.possibleNote"], missing: ["records.missing", "records.missingNote"] } as const;
  const all = useMemo(() => findings(ix, tree), [ix, tree]);
  const branches = useMemo(() => branchMembers(ix).map((b) => ({ ...b, c: completenessOf(ix, tree, b.ids) })), [ix, tree]);
  const whole = useMemo(() => completenessOf(ix, tree, ix.members.map((m) => m.id)), [ix, tree]);
  const [open, setOpen] = useState<string | null>(null);
  const groups = useMemo(() => {
    const by = new Map<string, Finding[]>();
    for (const f of all) {
      const key = `${f.level}:${f.kind}`;
      (by.get(key) ?? by.set(key, []).get(key)!).push(f);
    }
    return by;
  }, [all]);
  const name = (id: string) => nasabIn(ix, id, 2);

  return (
    <div className="h-full overflow-auto bg-parchment-50">
      <div className="mx-auto max-w-5xl space-y-6 p-6">
        <header>
          <h2 className="text-xl font-semibold text-bark-900">{t("records.title")}</h2>
          <p className="mt-1 text-sm text-bark-500">
            {t("records.intro")}
          </p>
        </header>

        <section className="rounded-lg border border-parchment-300 bg-white p-4">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-bark-500">{t("records.completeness")}</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-start text-xs text-bark-500">
                <th className="pb-2 text-start font-normal">{t("filter.branch")}</th>
                <th className="pb-2 text-end font-normal">{t("records.people")}</th>
                {AREAS.map((a) => <th key={a} className="pb-2 ps-4 text-start font-normal" title={t(`records.areaFields.${a}`)}>{t(`records.area.${a}`)}</th>)}
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-parchment-200 font-semibold">
                <td className="py-1.5">{t("records.wholeFamily")}</td>
                <td className="py-1.5 text-end tabular-nums">{n(whole.people)}</td>
                {AREAS.map((a) => <td key={a} className="py-1.5 ps-4"><Bar share={whole.areas[a].share} /></td>)}
              </tr>
              {branches.map(({ head, c }) => (
                <tr key={head.id} className="border-t border-parchment-100">
                  <td className="py-1.5">
                    <button type="button" className="font-naskh text-[15px] hover:underline" dir="auto" onClick={() => onOpenMember(head.id)}>{head.name}</button>
                  </td>
                  <td className="py-1.5 text-end tabular-nums">{n(c.people)}</td>
                  {AREAS.map((a) => <td key={a} className="py-1.5 ps-4"><Bar share={c.areas[a].share} /></td>)}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-bark-400">
            {t("records.note")}
          </p>
        </section>

        {LEVELS.map(({ level, tone }) => {
          const kinds = [...groups].filter(([k]) => k.startsWith(`${level}:`));
          const total = kinds.reduce((a, [, list]) => a + list.length, 0);
          return (
            <section key={level} className={`rounded-lg border p-4 ${tone}`}>
              <h3 className="text-sm font-semibold uppercase tracking-wide">{t(levelText[level][0])} ({n(total)})</h3>
              <p className="mb-2 text-xs opacity-80">{t(levelText[level][1])}</p>
              {total === 0 ? <p className="text-sm">{t("records.nothing")}</p> : (
                <ul className="space-y-1">
                  {kinds.sort((a, b) => b[1].length - a[1].length).map(([key, list]) => (
                    <li key={key}>
                      <button type="button" className="flex w-full items-center justify-between rounded px-2 py-1 text-start text-sm hover:bg-black/5"
                        aria-expanded={open === key} onClick={() => setOpen(open === key ? null : key)}>
                        <span>{title(list[0])}</span><span className="tabular-nums">{n(list.length)}</span>
                      </button>
                      {open === key && (
                        <div className="flex flex-wrap gap-1 px-2 pb-2 pt-1">
                          {list.slice(0, 300).map((f, i) => (
                            <button key={i} type="button" onClick={() => onOpenMember(f.memberId)}
                              className="rounded-full border border-black/10 bg-white px-2 py-0.5 text-start font-naskh text-[14px] text-bark-900 hover:border-bark-400" dir="auto"
                              title={f.otherIds?.length ? t("records.with", { names: f.otherIds.map(name).join(t("list.separator")) }) : undefined}>
                              {name(f.memberId)}{f.otherIds?.length ? ` ↔ ${name(f.otherIds[0])}` : ""}
                            </button>
                          ))}
                          {list.length > 300 && <span className="text-xs">{t("records.more", { n: n(list.length - 300) })}</span>}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
