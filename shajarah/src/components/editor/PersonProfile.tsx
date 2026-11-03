"use client";

// A person's profile: who they are, their family (every relative a link to
// their own profile), where they stand in the family, and how complete
// their record is. Read from the family engine (src/lib/family); editing
// stays in the Edit tab. Only what the records hold is shown: nothing is
// guessed, and an empty section says what is not recorded.

import { useMemo, type ReactNode } from "react";
import { generationText } from "@/lib/family/generations";
import { nasabIn, type FamilyIndex } from "@/lib/family/index";
import { findings, type Finding, type FindingKind } from "@/lib/family/quality";
import { relationship } from "@/lib/relationship";
import type { MemberDTO, TreeDTO } from "@/lib/types";

interface Props {
  ix: FamilyIndex;
  tree: Pick<TreeDTO, "members" | "marriages" | "citations">;
  member: MemberDTO;
  onOpen: (id: string) => void;
  /** Back and forward through the people opened. */
  onBack?: () => void;
  onForward?: () => void;
}

const MISSING_LABEL: Partial<Record<FindingKind, string>> = {
  "no-gender": "Gender", "no-birth-year": "Year of birth", "no-death-year": "Year of death", "no-father": "Father",
  "no-mother": "Mother", "no-marriage-year": "Year of marriage", "no-notes": "Notes", "no-source": "A source",
};
const ISSUE_LABEL: Partial<Record<FindingKind, (f: Finding, name: (id: string) => string) => string>> = {
  "death-before-birth": (f) => `Died (${f.detail?.died}) before being born (${f.detail?.born})`,
  "child-before-parent": (f, n) => `Born (${f.detail?.born}) before a parent, ${n(f.otherIds![0])} (${f.detail?.parentBorn})`,
  "own-ancestor": () => "Recorded as their own ancestor",
  "marriage-ends-before-start": (f, n) => `Marriage to ${n(f.otherIds![0])} ends (${f.detail?.end}) before it begins (${f.detail?.start})`,
  "young-parent": (f, n) => `${n(f.otherIds![0])} would have been ${f.detail?.age} at the birth`,
  "old-parent": (f, n) => `${n(f.otherIds![0])} would have been ${f.detail?.age} at the birth`,
  "born-after-father-died": (f) => `Born ${f.detail?.born}, after the father died (${f.detail?.parentDied})`,
  "born-after-mother-died": (f) => `Born ${f.detail?.born}, after the mother died (${f.detail?.parentDied})`,
  "married-young": (f) => `Would have married at ${f.detail?.age}`,
  "death-year-but-living": (f) => `Has a year of death (${f.detail?.died}) but is not marked as deceased`,
  "likely-deceased": (f) => `Born ${f.detail?.born} and not marked as deceased`,
  "possible-duplicate": (f, n) => `May be the same person as ${n(f.otherIds![0])}`,
};

function Section({ title, children, open = true }: { title: string; children: ReactNode; open?: boolean }) {
  return (
    <details className="group rounded-md border border-parchment-200" open={open}>
      <summary className="flex cursor-pointer select-none items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wide text-bark-500">
        {title}<span className="text-bark-400 group-open:rotate-90">›</span>
      </summary>
      <div className="space-y-2 px-3 pb-3 text-sm">{children}</div>
    </details>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[7.5rem_1fr] items-baseline gap-2">
      <span className="text-xs text-bark-400">{label}</span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

// (findings for the whole family, once per version of it)
const findingsCache = new WeakMap<FamilyIndex, Finding[]>();
const familyFindings = (ix: FamilyIndex, tree: Pick<TreeDTO, "citations">) => {
  let f = findingsCache.get(ix);
  if (!f) findingsCache.set(ix, (f = findings(ix, tree)));
  return f;
};

const years = (m: MemberDTO) =>
  m.birthYear || m.deathYear ? `${m.birthYear ?? "?"}–${m.deathYear ?? (m.isDeceased ? "?" : "")}` : m.isDeceased ? "deceased" : "";

export function PersonProfile({ ix, tree, member: m, onOpen, onBack, onForward }: Props) {
  const name = (id: string) => ix.get(id)?.name ?? "—";
  const Person = ({ p, note }: { p: MemberDTO; note?: string }) => (
    <button type="button" onClick={() => onOpen(p.id)}
      className="inline-flex max-w-full items-baseline gap-1 rounded-full border border-parchment-300 bg-white px-2 py-0.5 text-start hover:border-bark-400 hover:bg-parchment-50">
      <span className="truncate font-naskh text-[15px]" dir="auto">{p.name}</span>
      {(note || years(p)) && <span className="whitespace-nowrap text-[11px] text-bark-400">{note ?? years(p)}</span>}
    </button>
  );
  const People = ({ list, none, note }: { list: MemberDTO[]; none: string; note?: (p: MemberDTO) => string | undefined }) =>
    list.length ? <div className="flex flex-wrap gap-1">{list.map((p) => <Person key={p.id} p={p} note={note?.(p)} />)}</div> : <span className="text-xs text-bark-400">{none}</span>;

  const g = ix.generations.get(m.id);
  const { father, mother } = ix.parents(m.id);
  const spouses = ix.spouses(m.id);
  const children = ix.children(m.id);
  const sibs = ix.siblings(m.id);
  const branches = ix.branchesOf(m.id);
  const descendants = ix.descendants(m.id).size;
  const below = ix.depthBelow(m.id);
  const ref = ix.referenceId ? ix.get(ix.referenceId) : undefined;
  const toRef = useMemo(
    () => (ref && ref.id !== m.id ? relationship(tree.members, tree.marriages, ref.id, m.id) : null),
    [ref, m.id, tree.members, tree.marriages],
  );
  const mine = useMemo(() => familyFindings(ix, tree).filter((f) => f.memberId === m.id || f.otherIds?.includes(m.id)), [ix, tree, m.id]);
  const gaps = mine.filter((f) => f.memberId === m.id && f.level === "missing");
  const issues = mine.filter((f) => f.level !== "missing");
  // children grouped by their other parent (several marriages)
  const byOther = new Map<string, MemberDTO[]>();
  for (const c of children) {
    const o = c.fatherId === m.id ? c.motherId : c.fatherId;
    const key = o ?? "";
    (byOther.get(key) ?? byOther.set(key, []).get(key)!).push(c);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1">
        <button type="button" className="btn-ghost px-2 text-sm" disabled={!onBack} onClick={onBack} aria-label="Back to the previous person">‹ Back</button>
        <button type="button" className="btn-ghost px-2 text-sm" disabled={!onForward} onClick={onForward} aria-label="Forward">Forward ›</button>
      </div>
      <header className="space-y-1">
        <p className="font-naskh text-lg leading-snug" dir="auto">{nasabIn(ix, m.id, 6)}</p>
        <p className="flex flex-wrap items-center gap-2 text-xs text-bark-500">
          {m.laqab && <span className="font-naskh text-sm" dir="auto">{m.laqab}</span>}
          <span>{m.gender === "FEMALE" ? "Female" : m.gender === "MALE" ? "Male" : "Gender not recorded"}</span>
          <span>{m.isDeceased ? "Deceased" : "Living (not recorded as deceased)"}</span>
          {years(m) && <span>{years(m)}</span>}
        </p>
      </header>

      <Section title="Family">
        <Row label="Father">{father ? <Person p={father} /> : <span className="text-xs text-bark-400">Not recorded</span>}</Row>
        <Row label="Mother">{mother ? <Person p={mother} /> : <span className="text-xs text-bark-400">Not recorded</span>}</Row>
        <Row label={spouses.length > 1 ? "Spouses" : "Spouse"}>
          <People list={spouses.map((s) => s.person)} none="None recorded"
            note={(p) => {
              const mar = spouses.find((s) => s.person.id === p.id)!.marriage;
              return mar.startYear || mar.endYear ? `married ${mar.startYear ?? "?"}${mar.endYear ? `–${mar.endYear}` : ""}` : undefined;
            }} />
        </Row>
        <Row label={`Children (${children.length})`}>
          {children.length === 0 ? <span className="text-xs text-bark-400">None recorded</span> : byOther.size > 1 ? (
            <div className="space-y-1">
              {[...byOther].map(([other, kids]) => (
                <div key={other}>
                  <span className="text-[11px] text-bark-400">{other ? <>with <span className="font-naskh" dir="auto">{name(other)}</span></> : "other parent not recorded"}</span>
                  <People list={kids} none="" />
                </div>
              ))}
            </div>
          ) : <People list={children} none="" />}
        </Row>
        <Row label="Brothers & sisters">
          <div className="space-y-1">
            {sibs.full.length > 0 && <People list={sibs.full} none="" />}
            {sibs.paternal.length > 0 && <div><span className="text-[11px] text-bark-400">by the father</span><People list={sibs.paternal} none="" /></div>}
            {sibs.maternal.length > 0 && <div><span className="text-[11px] text-bark-400">by the mother</span><People list={sibs.maternal} none="" /></div>}
            {(() => {
              // (one parent shared; the other not recorded for one or both, so full or half cannot be told)
              const byFather = sibs.unknown.filter((s) => !!m.fatherId && s.fatherId === m.fatherId);
              const byMother = sibs.unknown.filter((s) => !byFather.includes(s));
              return (
                <>
                  {byFather.length > 0 && <div><span className="text-[11px] text-bark-400">same father (mothers not all recorded)</span><People list={byFather} none="" /></div>}
                  {byMother.length > 0 && <div><span className="text-[11px] text-bark-400">same mother (fathers not all recorded)</span><People list={byMother} none="" /></div>}
                </>
              );
            })()}
            {!sibs.full.length && !sibs.paternal.length && !sibs.maternal.length && !sibs.unknown.length && <span className="text-xs text-bark-400">None recorded</span>}
          </div>
        </Row>
        <Row label="Grandparents"><People list={ix.grandparents(m.id)} none="None recorded" /></Row>
        <Row label={`Grandchildren (${ix.grandchildren(m.id).length})`}><People list={ix.grandchildren(m.id)} none="None recorded" /></Row>
        {(ix.stepParents(m.id).length > 0 || ix.stepChildren(m.id).length > 0) && (
          <Row label="Step-family">
            <div className="space-y-1">
              {ix.stepParents(m.id).length > 0 && <div><span className="text-[11px] text-bark-400">step-parents (a parent&apos;s spouse)</span><People list={ix.stepParents(m.id)} none="" /></div>}
              {ix.stepChildren(m.id).length > 0 && <div><span className="text-[11px] text-bark-400">step-children (a spouse&apos;s children)</span><People list={ix.stepChildren(m.id)} none="" /></div>}
            </div>
          </Row>
        )}
      </Section>

      <Section title="In the family">
        <Row label="Generation">
          <span>{generationText(g, "en", m.gender)}</span>
          {g?.kind === "level" && g.alt && (
            <span className="block text-[11px] text-bark-400">through the {g.via}; {generationText({ kind: "level", level: g.alt.level, via: g.alt.via })} through the {g.alt.via}</span>
          )}
        </Row>
        <Row label="Branch">
          <People list={branches} none={m.id === ix.referenceId ? "The family's Generation 1" : "Not within a main branch"} note={() => "branch"} />
        </Row>
        <Row label="Line"><span className="font-naskh" dir="auto">{nasabIn(ix, m.id, 30)}</span></Row>
        <Row label="Descendants">
          {descendants ? <span>{descendants} recorded, over {below} generation{below === 1 ? "" : "s"}</span> : <span className="text-xs text-bark-400">None recorded</span>}
        </Row>
        {ref && (
          <Row label={`To ${ref.name}`}>
            {m.id === ref.id ? <span className="text-xs">Generations are counted from this person.</span> : toRef && (
              <span className="block">
                <span className="block font-naskh" dir="rtl">{toRef.arabic}</span>
                <span className="block text-xs text-bark-500">{toRef.english}</span>
              </span>
            )}
          </Row>
        )}
      </Section>

      <Section title={`Record${gaps.length || issues.length ? ` (${gaps.length + issues.length})` : ""}`} open={issues.length > 0}>
        {issues.map((f, i) => (
          <p key={i} className={`rounded px-2 py-1 text-xs ${f.level === "confirmed" ? "bg-red-50 text-red-800" : "bg-amber-50 text-amber-900"}`}>
            <span className="font-semibold">{f.level === "confirmed" ? "Cannot be right: " : "Worth checking: "}</span>
            {ISSUE_LABEL[f.kind]?.(f, name) ?? f.kind}
          </p>
        ))}
        {gaps.length ? (
          <p className="text-xs text-bark-500">Not recorded: {gaps.map((f) => MISSING_LABEL[f.kind] ?? f.kind).join(", ")}.</p>
        ) : !issues.length && <p className="text-xs text-bark-500">Nothing missing among the fields the records hold.</p>}
        {m.notes && <p className="whitespace-pre-line rounded bg-parchment-50 px-2 py-1 text-xs" dir="auto">{m.notes}</p>}
      </Section>
    </div>
  );
}
