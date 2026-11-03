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

const AREAS: { key: FieldArea; label: string; fields: string }[] = [
  { key: "personal", label: "Personal", fields: "gender, years of birth and death" },
  { key: "relationships", label: "Relationships", fields: "father, mother, years of marriage" },
  { key: "history", label: "History", fields: "notes, sources" },
];

const TITLES: Record<FindingKind, string> = {
  "no-gender": "Gender not recorded", "no-birth-year": "No year of birth", "no-death-year": "Deceased, no year of death",
  "no-father": "No father recorded", "no-mother": "No mother recorded", "no-marriage-year": "A marriage without a year",
  "no-notes": "No notes", "no-source": "No source cited",
  "death-before-birth": "Died before being born", "child-before-parent": "Born before a parent",
  "own-ancestor": "Recorded as their own ancestor", "marriage-ends-before-start": "A marriage ending before it began",
  "young-parent": "A parent unusually young at the birth", "old-parent": "A parent unusually old at the birth",
  "born-after-father-died": "Born more than a year after the father died", "born-after-mother-died": "Born after the mother died",
  "married-young": "Married unusually young", "death-year-but-living": "A year of death, but not marked deceased",
  "likely-deceased": "Born over 110 years ago, not marked deceased", "possible-duplicate": "Possibly the same person twice",
};

const LEVELS = [
  { level: "confirmed" as const, title: "Cannot be right", note: "Impossible as recorded: one of the figures is wrong.", tone: "border-red-200 bg-red-50 text-red-900" },
  { level: "possible" as const, title: "Worth checking", note: "Unusual, possibly right: check against the family's sources.", tone: "border-amber-200 bg-amber-50 text-amber-900" },
  { level: "missing" as const, title: "Not recorded", note: "Information the records do not hold yet.", tone: "border-parchment-300 bg-white text-bark-900" },
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
          <h2 className="text-xl font-semibold text-bark-900">The family&apos;s records</h2>
          <p className="mt-1 text-sm text-bark-500">
            How complete the records are, and what in them cannot be right or is worth a look. Nothing here changes a record:
            choosing a name opens the person, where the family can correct or complete it. Places, full dates and
            biographies are not judged yet: the records do not hold them.
          </p>
        </header>

        <section className="rounded-lg border border-parchment-300 bg-white p-4">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-bark-500">Completeness</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-start text-xs text-bark-500">
                <th className="pb-2 text-start font-normal">Branch</th>
                <th className="pb-2 text-end font-normal">People</th>
                {AREAS.map((a) => <th key={a.key} className="pb-2 ps-4 text-start font-normal" title={a.fields}>{a.label}</th>)}
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-parchment-200 font-semibold">
                <td className="py-1.5">The whole family</td>
                <td className="py-1.5 text-end tabular-nums">{whole.people}</td>
                {AREAS.map((a) => <td key={a.key} className="py-1.5 ps-4"><Bar share={whole.areas[a.key].share} /></td>)}
              </tr>
              {branches.map(({ head, c }) => (
                <tr key={head.id} className="border-t border-parchment-100">
                  <td className="py-1.5">
                    <button type="button" className="font-naskh text-[15px] hover:underline" dir="auto" onClick={() => onOpenMember(head.id)}>{head.name}</button>
                  </td>
                  <td className="py-1.5 text-end tabular-nums">{c.people}</td>
                  {AREAS.map((a) => <td key={a.key} className="py-1.5 ps-4"><Bar share={c.areas[a.key].share} /></td>)}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-bark-400">
            Each share counts only the fields that apply: no year of death is expected of the living, no parents of the
            oldest recorded ancestor or of those who married in.
          </p>
        </section>

        {LEVELS.map(({ level, title, note, tone }) => {
          const kinds = [...groups].filter(([k]) => k.startsWith(`${level}:`));
          const total = kinds.reduce((a, [, list]) => a + list.length, 0);
          return (
            <section key={level} className={`rounded-lg border p-4 ${tone}`}>
              <h3 className="text-sm font-semibold uppercase tracking-wide">{title} ({total})</h3>
              <p className="mb-2 text-xs opacity-80">{note}</p>
              {total === 0 ? <p className="text-sm">Nothing.</p> : (
                <ul className="space-y-1">
                  {kinds.sort((a, b) => b[1].length - a[1].length).map(([key, list]) => (
                    <li key={key}>
                      <button type="button" className="flex w-full items-center justify-between rounded px-2 py-1 text-start text-sm hover:bg-black/5"
                        aria-expanded={open === key} onClick={() => setOpen(open === key ? null : key)}>
                        <span>{TITLES[list[0].kind]}</span><span className="tabular-nums">{list.length}</span>
                      </button>
                      {open === key && (
                        <div className="flex flex-wrap gap-1 px-2 pb-2 pt-1">
                          {list.slice(0, 300).map((f, i) => (
                            <button key={i} type="button" onClick={() => onOpenMember(f.memberId)}
                              className="rounded-full border border-black/10 bg-white px-2 py-0.5 text-start font-naskh text-[14px] text-bark-900 hover:border-bark-400" dir="auto"
                              title={f.otherIds?.length ? `with ${f.otherIds.map(name).join(", ")}` : undefined}>
                              {name(f.memberId)}{f.otherIds?.length ? ` ↔ ${name(f.otherIds[0])}` : ""}
                            </button>
                          ))}
                          {list.length > 300 && <span className="text-xs">and {list.length - 300} more</span>}
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
