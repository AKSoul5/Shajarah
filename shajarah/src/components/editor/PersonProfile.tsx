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
import { useLanguage } from "@/lib/i18n";
import type { MessageKey } from "@/lib/messages";
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
  m.birthYear || m.deathYear ? `${m.birthYear ?? "?"}–${m.deathYear ?? (m.isDeceased ? "?" : "")}` : "";

export function PersonProfile({ ix, tree, member: m, onOpen, onBack, onForward }: Props) {
  const { t, n, lang } = useLanguage();
  const name = (id: string) => ix.get(id)?.name ?? "—";
  const her = m.gender === "FEMALE";
  const finding = (f: Finding) => t(`finding.${f.kind}` as MessageKey, { ...(f.detail ?? {}), other: f.otherIds?.[0] ? name(f.otherIds[0]) : "" });
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
        <button type="button" className="btn-ghost px-2 text-sm" disabled={!onBack} onClick={onBack} aria-label={t("person.backLabel")}>{t("person.back")}</button>
        <button type="button" className="btn-ghost px-2 text-sm" disabled={!onForward} onClick={onForward} aria-label={t("person.forward")}>{t("person.forward")}</button>
      </div>
      <header className="space-y-1">
        <p className="font-naskh text-lg leading-snug" dir="auto">{nasabIn(ix, m.id, 6)}</p>
        <p className="flex flex-wrap items-center gap-2 text-xs text-bark-500">
          {m.laqab && <span className="font-naskh text-sm" dir="auto">{m.laqab}</span>}
          <span>{t(m.gender === "FEMALE" ? "person.female" : m.gender === "MALE" ? "person.male" : "person.genderUnknown")}</span>
          <span>{m.isDeceased ? t(her ? "person.deceased.f" : "person.deceased.m") : t("person.living")}</span>
          {years(m) && <span>{years(m)}</span>}
        </p>
      </header>

      <Section title={t("section.family")}>
        <Row label={t("row.father")}>{father ? <Person p={father} /> : <span className="text-xs text-bark-400">{t("kin.notRecorded")}</span>}</Row>
        <Row label={t("row.mother")}>{mother ? <Person p={mother} /> : <span className="text-xs text-bark-400">{t("kin.notRecorded")}</span>}</Row>
        <Row label={t(her ? (spouses.length > 1 ? "row.spouses.ofWoman" : "row.spouse.ofWoman") : spouses.length > 1 ? "row.spouses.ofMan" : "row.spouse.ofMan")}>
          <People list={spouses.map((s) => s.person)} none={t("kin.noneRecorded")}
            note={(p) => {
              const mar = spouses.find((s) => s.person.id === p.id)!.marriage;
              return mar.startYear || mar.endYear ? t("kin.married", { from: mar.startYear ?? "?", to: mar.endYear ? `–${mar.endYear}` : "" }) : undefined;
            }} />
        </Row>
        <Row label={t("row.children", { n: n(children.length) })}>
          {children.length === 0 ? <span className="text-xs text-bark-400">{t("kin.noneRecorded")}</span> : byOther.size > 1 ? (
            <div className="space-y-1">
              {[...byOther].map(([other, kids]) => (
                <div key={other}>
                  <span className="text-[11px] text-bark-400">{other ? <>{t("kin.with")} <span className="font-naskh" dir="auto">{name(other)}</span></> : t("kin.otherParentUnknown")}</span>
                  <People list={kids} none="" />
                </div>
              ))}
            </div>
          ) : <People list={children} none="" />}
        </Row>
        <Row label={t("row.siblings")}>
          <div className="space-y-1">
            {sibs.full.length > 0 && <People list={sibs.full} none="" />}
            {sibs.paternal.length > 0 && <div><span className="text-[11px] text-bark-400">{t("kin.byFather")}</span><People list={sibs.paternal} none="" /></div>}
            {sibs.maternal.length > 0 && <div><span className="text-[11px] text-bark-400">{t("kin.byMother")}</span><People list={sibs.maternal} none="" /></div>}
            {(() => {
              // (one parent shared; the other not recorded for one or both, so full or half cannot be told)
              const byFather = sibs.unknown.filter((s) => !!m.fatherId && s.fatherId === m.fatherId);
              const byMother = sibs.unknown.filter((s) => !byFather.includes(s));
              return (
                <>
                  {byFather.length > 0 && <div><span className="text-[11px] text-bark-400">{t("kin.sameFather")}</span><People list={byFather} none="" /></div>}
                  {byMother.length > 0 && <div><span className="text-[11px] text-bark-400">{t("kin.sameMother")}</span><People list={byMother} none="" /></div>}
                </>
              );
            })()}
            {!sibs.full.length && !sibs.paternal.length && !sibs.maternal.length && !sibs.unknown.length && <span className="text-xs text-bark-400">{t("kin.noneRecorded")}</span>}
          </div>
        </Row>
        <Row label={t("row.grandparents")}><People list={ix.grandparents(m.id)} none={t("kin.noneRecorded")} /></Row>
        <Row label={t("row.grandchildren", { n: n(ix.grandchildren(m.id).length) })}><People list={ix.grandchildren(m.id)} none={t("kin.noneRecorded")} /></Row>
        {(ix.stepParents(m.id).length > 0 || ix.stepChildren(m.id).length > 0) && (
          <Row label={t("row.stepFamily")}>
            <div className="space-y-1">
              {ix.stepParents(m.id).length > 0 && <div><span className="text-[11px] text-bark-400">{t("kin.stepParents")}</span><People list={ix.stepParents(m.id)} none="" /></div>}
              {ix.stepChildren(m.id).length > 0 && <div><span className="text-[11px] text-bark-400">{t("kin.stepChildren")}</span><People list={ix.stepChildren(m.id)} none="" /></div>}
            </div>
          </Row>
        )}
      </Section>

      <Section title={t("section.inFamily")}>
        <Row label={t("row.generation")}>
          <span>{generationText(g, lang, m.gender)}</span>
          {g?.kind === "level" && g.alt && (
            <span className="block text-[11px] text-bark-400">{t("kin.throughParent", { via: t(`kin.via.${g.via === "mother" ? "mother" : "father"}`), other: generationText({ kind: "level", level: g.alt.level, via: g.alt.via }, lang), altVia: t(`kin.via.${g.alt.via}`) })}</span>
          )}
        </Row>
        <Row label={t("row.branch")}>
          <People list={branches} none={t(m.id === ix.referenceId ? "kin.generationOne" : "kin.outsideBranches")} note={() => t("kin.branchNote")} />
        </Row>
        <Row label={t("row.line")}><span className="font-naskh" dir="auto">{nasabIn(ix, m.id, 30)}</span></Row>
        <Row label={t("row.descendants")}>
          {descendants ? <span>{t("kin.descendants", { n: n(descendants), g: n(below) })}</span> : <span className="text-xs text-bark-400">{t("kin.noneRecorded")}</span>}
        </Row>
        {ref && (
          <Row label={t("row.to", { name: ref.name })}>
            {m.id === ref.id ? <span className="text-xs">{t("kin.countedFromHere")}</span> : toRef && (
              <span className="block">
                <span className={`block ${lang === "ar" ? "font-naskh" : ""}`} dir={lang === "ar" ? "rtl" : "ltr"}>{lang === "ar" ? toRef.arabic : toRef.english}</span>
                <span className={`block text-xs text-bark-500 ${lang === "ar" ? "" : "font-naskh"}`} dir={lang === "ar" ? "ltr" : "rtl"}>{lang === "ar" ? toRef.english : toRef.arabic}</span>
              </span>
            )}
          </Row>
        )}
      </Section>

      <Section title={`${t("section.record")}${gaps.length || issues.length ? ` (${n(gaps.length + issues.length)})` : ""}`} open={issues.length > 0}>
        {issues.map((f, i) => (
          <p key={i} className={`rounded px-2 py-1 text-xs ${f.level === "confirmed" ? "bg-red-50 text-red-800" : "bg-amber-50 text-amber-900"}`}>
            <span className="font-semibold">{t(f.level === "confirmed" ? "record.cannot" : "record.check")}</span>
            {finding(f)}
          </p>
        ))}
        {gaps.length ? (
          <p className="text-xs text-bark-500">{t("record.notRecorded", { list: gaps.map((f) => t(`field.${f.kind}` as MessageKey)).join(t("list.separator")) })}</p>
        ) : !issues.length && <p className="text-xs text-bark-500">{t("record.nothingMissing")}</p>}
        {m.notes && <p className="whitespace-pre-line rounded bg-parchment-50 px-2 py-1 text-xs" dir="auto">{m.notes}</p>}
      </Section>
    </div>
  );
}
