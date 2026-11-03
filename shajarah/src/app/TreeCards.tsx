"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { normalizeName } from "@/lib/nasab";
import type { TreeSummary } from "@/lib/types";
import { Icon } from "@/components/Icon";
import { rich, useLanguage, type Lang } from "@/lib/i18n";
import type { MessageKey } from "@/lib/messages";

/** "3 hours ago", "yesterday", "12 Oct 2026", in the interface's language. */
export function ago(iso: string, lang: Lang, now = Date.now()): string {
  const s = Math.max(0, (now - new Date(iso).getTime()) / 1000);
  const locale = lang === "ar" ? "ar-EG" : "en-GB";
  const rel = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  if (s < 60) return rel.format(0, "second");
  if (s < 3600) return rel.format(-Math.floor(s / 60), "minute");
  if (s < 86400) return rel.format(-Math.floor(s / 3600), "hour");
  if (s < 7 * 86400) return rel.format(-Math.max(1, Math.floor(s / 86400)), "day");
  return new Date(iso).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" });
}

type Sort = "recent" | "name" | "people";
const SORTS: Record<Sort, { label: MessageKey; compare: (a: TreeSummary, b: TreeSummary) => number }> = {
  recent: { label: "cards.recent", compare: (a, b) => b.updatedAt.localeCompare(a.updatedAt) },
  name: { label: "cards.name", compare: (a, b) => a.name.localeCompare(b.name, ["ar", "en"]) },
  people: { label: "cards.people", compare: (a, b) => b.memberCount - a.memberCount },
};

/** The first letter of the family's name, after "آل" / "Al" (for the card's monogram). */
const initial = (name: string) => (name.replace(/^\s*(آل|ال|Al[\s-]|The\s)\s*/i, "").trim()[0] ?? "؟").toUpperCase();

/**
 * The families on this computer: searchable by name or poster title,
 * sorted by when they were last edited (or by name, or size), pinned ones
 * first. Each opens; each can be pinned, or deleted after asking.
 */
export function TreeCards({ trees: initialTrees }: { trees: TreeSummary[] }) {
  const router = useRouter();
  const { t: tr, n, lang } = useLanguage(); // (t is a family below)
  const [trees, setTrees] = useState(initialTrees);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("recent");
  const [confirming, setConfirming] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const shown = useMemo(() => {
    const norm = normalizeName; // (also ignores hamza forms, diacritics, spaces and case)
    const q = norm(query.trim());
    return trees
      .filter((t) => !q || norm(t.name).includes(q) || norm(t.title ?? "").includes(q))
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || SORTS[sort].compare(a, b));
  }, [trees, query, sort]);

  const remove = async (t: TreeSummary) => {
    setBusy(t.id);
    setError(null);
    const res = await fetch(`/api/trees/${t.id}`, { method: "DELETE" }).catch(() => null);
    setBusy(null);
    setConfirming(null);
    if (!res?.ok) return setError(tr("cards.couldNotDelete", { name: t.name }));
    setTrees((ts) => ts.filter((x) => x.id !== t.id));
    router.refresh();
  };

  const pin = async (t: TreeSummary) => {
    setError(null);
    // shown at once; put back if the change could not be saved
    setTrees((ts) => ts.map((x) => (x.id === t.id ? { ...x, pinned: !t.pinned } : x)));
    const res = await fetch(`/api/trees/${t.id}/pin`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pinned: !t.pinned }),
    }).catch(() => null);
    if (!res?.ok) {
      setTrees((ts) => ts.map((x) => (x.id === t.id ? { ...x, pinned: t.pinned } : x)));
      setError(tr(t.pinned ? "cards.couldNotUnpin" : "cards.couldNotPin", { name: t.name }));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-0 flex-1 basis-56">
          <span className="sr-only">{tr("cards.searchLabel")}</span>
          <span aria-hidden className="pointer-events-none absolute inset-y-0 start-2.5 flex items-center text-bark-500"><Icon name="search" className="h-3.5 w-3.5" /></span>
          <input
            type="search"
            className="input ps-7 font-naskh text-base"
            dir="auto"
            placeholder={tr("cards.search")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-bark-700">
          {tr("cards.sort")}
          <select className="input w-auto" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            {(Object.keys(SORTS) as Sort[]).map((k) => <option key={k} value={k}>{tr(SORTS[k].label)}</option>)}
          </select>
        </label>
      </div>

      {shown.length === 0 ? (
        <p className="rounded-xl border border-dashed border-parchment-300 bg-white/60 p-6 text-center text-sm text-bark-500">
          {rich(tr("cards.noMatch"), { q: <span dir="auto">{query}</span> })}
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label={tr("home.families")}>
          {shown.map((t) => (
            <li
              key={t.id}
              className={`group relative flex min-w-0 flex-col rounded-xl border bg-white shadow-sm transition focus-within:border-gilt-500 hover:border-gilt-400 hover:shadow-md ${
                t.pinned ? "border-gilt-400" : "border-parchment-300"
              }`}
            >
              <Link
                href={`/trees/${t.id}`}
                className="flex flex-1 items-start gap-3 rounded-xl p-4 pe-20 outline-none focus-visible:ring-2 focus-visible:ring-gilt-500"
              >
                <span aria-hidden className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-gilt-400 bg-parchment-50 font-ruqaa text-xl text-gilt-600">
                  {initial(t.name)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-left font-naskh text-lg font-bold leading-snug text-bark-900" dir="auto">{t.name}</span>
                  <span className="mt-0.5 block text-xs text-bark-500">
                    {tr(t.memberCount === 1 ? "count.person.one" : "count.person.many", { n: n(t.memberCount) })} · {tr("cards.edited", { ago: ago(t.updatedAt, lang) })}
                  </span>
                  {t.title && t.title !== t.name && (
                    <span className="mt-1 block truncate text-left font-naskh text-sm text-bark-500" dir="auto">{t.title}</span>
                  )}
                </span>
              </Link>
              <div className="absolute end-2 top-2 flex items-center gap-0.5">
                <button
                  type="button"
                  className={`rounded-md px-1.5 py-0.5 text-base leading-none outline-none transition focus-visible:ring-2 focus-visible:ring-gilt-500 ${
                    t.pinned ? "text-gilt-600" : "text-bark-400 hover:text-gilt-600"
                  }`}
                  aria-pressed={t.pinned}
                  aria-label={tr(t.pinned ? "cards.unpin" : "cards.pin", { name: t.name })}
                  title={tr(t.pinned ? "cards.pinnedTitle" : "cards.pinTitle")}
                  onClick={() => void pin(t)}
                >
                  <Icon name="star" filled={t.pinned} className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="rounded-md px-1.5 py-0.5 text-xs text-bark-400 outline-none transition hover:bg-red-50 hover:text-red-700 focus-visible:ring-2 focus-visible:ring-red-400"
                  aria-label={tr("cards.deleteLabel", { name: t.name })}
                  onClick={() => setConfirming(t.id)}
                >
                  {tr("cards.delete")}
                </button>
              </div>
              {confirming === t.id && (
                <div role="alertdialog" aria-label={tr("cards.deleteTitle", { name: t.name })} className="flex flex-wrap items-center justify-end gap-2 border-t border-parchment-200 px-4 py-2 text-xs">
                  <span className="me-auto text-red-800">{rich(tr("cards.confirm"), { name: <b dir="auto">{t.name}</b> })}</span>
                  <button type="button" className="btn-ghost py-0.5 text-xs" autoFocus onClick={() => setConfirming(null)}>{tr("cards.keep")}</button>
                  <button type="button" className="btn-danger py-0.5 text-xs" disabled={busy === t.id} onClick={() => void remove(t)}>
                    {busy === t.id ? tr("cards.deleting") : tr("cards.delete")}
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
      <p className="text-xs text-bark-500">
        {rich(tr("cards.tip"), { how: <b>{tr("cards.tipHow")}</b> })}
      </p>
    </div>
  );
}
