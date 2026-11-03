"use client";

// The member list's filters (src/lib/family/filters.ts): each one narrows
// the same list as the name search above it, so they work together.

import type { FamilyIndex } from "@/lib/family/index";
import type { PeopleQuery } from "@/lib/family/filters";
import type { FindingKind } from "@/lib/family/quality";

const MISSING: { value: FindingKind | "any"; label: string }[] = [
  { value: "any", label: "Anything missing" },
  { value: "no-birth-year", label: "No year of birth" },
  { value: "no-death-year", label: "Deceased, no year of death" },
  { value: "no-father", label: "No father recorded" },
  { value: "no-mother", label: "No mother recorded" },
  { value: "no-marriage-year", label: "Marriage without a year" },
  { value: "no-gender", label: "Gender not recorded" },
  { value: "no-notes", label: "No notes" },
  { value: "no-source", label: "No source cited" },
];

/** How many filters are set (the name search aside). */
export const activeFilters = (q: PeopleQuery) =>
  (["gender", "status", "generationFrom", "generationTo", "branchId", "bornFrom", "bornTo", "diedFrom", "diedTo", "missing"] as const)
    .filter((k) => q[k] !== undefined && q[k] !== "").length;

export function PeopleFilters({ ix, value, onChange }: { ix: FamilyIndex; value: PeopleQuery; onChange: (q: PeopleQuery) => void }) {
  const set = <K extends keyof PeopleQuery>(k: K, v: PeopleQuery[K] | "" | undefined) => {
    const next = { ...value };
    if (v === "" || v === undefined || (typeof v === "number" && Number.isNaN(v))) delete next[k];
    else next[k] = v as PeopleQuery[K];
    onChange(next);
  };
  const num = (s: string) => (s.trim() === "" ? undefined : Number(s));
  const field = "input h-8 w-full px-2 text-sm";
  const levels = [...new Set([...ix.generations.values()].flatMap((g) => (g.kind === "level" && g.level >= 1 ? [g.level] : [])))].sort((a, b) => a - b);
  return (
    <div className="grid grid-cols-2 gap-2 border-b border-parchment-200 bg-parchment-50 px-3 py-2 text-xs">
      <label className="space-y-0.5">
        <span className="text-bark-500">Gender</span>
        <select className={field} value={value.gender ?? ""} onChange={(e) => set("gender", e.target.value as PeopleQuery["gender"])}>
          <option value="">Any</option><option value="MALE">Male</option><option value="FEMALE">Female</option><option value="UNKNOWN">Not recorded</option>
        </select>
      </label>
      <label className="space-y-0.5">
        <span className="text-bark-500">Status</span>
        <select className={field} value={value.status ?? ""} onChange={(e) => set("status", e.target.value as PeopleQuery["status"])}>
          <option value="">Any</option><option value="living">Living (not recorded as deceased)</option><option value="deceased">Deceased</option>
        </select>
      </label>
      <label className="space-y-0.5">
        <span className="text-bark-500">Generation from</span>
        <select className={field} value={value.generationFrom ?? ""} onChange={(e) => set("generationFrom", num(e.target.value))}>
          <option value="">Any</option>{levels.map((l) => <option key={l} value={l}>Generation {l}</option>)}
        </select>
      </label>
      <label className="space-y-0.5">
        <span className="text-bark-500">to</span>
        <select className={field} value={value.generationTo ?? ""} onChange={(e) => set("generationTo", num(e.target.value))}>
          <option value="">Any</option>{levels.map((l) => <option key={l} value={l}>Generation {l}</option>)}
        </select>
      </label>
      <label className="col-span-2 space-y-0.5">
        <span className="text-bark-500">Branch</span>
        <select className={`${field} font-naskh`} value={value.branchId ?? ""} onChange={(e) => set("branchId", e.target.value)}>
          <option value="">All branches</option>
          {ix.branchHeads().map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
        </select>
      </label>
      <label className="space-y-0.5">
        <span className="text-bark-500">Born from (year)</span>
        <input className={field} inputMode="numeric" value={value.bornFrom ?? ""} onChange={(e) => set("bornFrom", num(e.target.value))} />
      </label>
      <label className="space-y-0.5">
        <span className="text-bark-500">to</span>
        <input className={field} inputMode="numeric" value={value.bornTo ?? ""} onChange={(e) => set("bornTo", num(e.target.value))} />
      </label>
      <label className="space-y-0.5">
        <span className="text-bark-500">Died from (year)</span>
        <input className={field} inputMode="numeric" value={value.diedFrom ?? ""} onChange={(e) => set("diedFrom", num(e.target.value))} />
      </label>
      <label className="space-y-0.5">
        <span className="text-bark-500">to</span>
        <input className={field} inputMode="numeric" value={value.diedTo ?? ""} onChange={(e) => set("diedTo", num(e.target.value))} />
      </label>
      <label className="col-span-2 space-y-0.5">
        <span className="text-bark-500">Incomplete records</span>
        <select className={field} value={value.missing ?? ""} onChange={(e) => set("missing", e.target.value as PeopleQuery["missing"])}>
          <option value="">Any record</option>
          {MISSING.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </label>
      <label className="col-span-2 flex items-center gap-2">
        <input type="checkbox" checked={!!value.includeSpouses} onChange={(e) => set("includeSpouses", e.target.checked || undefined)} />
        <span className="text-bark-700">Include people who married in, with the branch and generation they married into</span>
      </label>
      <div className="col-span-2 flex justify-end">
        <button type="button" className="text-bark-500 underline" onClick={() => onChange({})}>Clear the filters</button>
      </div>
    </div>
  );
}
