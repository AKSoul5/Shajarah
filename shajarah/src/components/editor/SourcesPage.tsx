"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { nasab } from "@/lib/genealogy";
import { normalizeName } from "@/lib/nasab";
import { likelyDuplicates, planMergeSources, sourceUsage } from "@/lib/sources";
import type { SourceDTO, TreeDTO } from "@/lib/types";
import type { CreateSourceInput, UpdateSourceInput } from "@/lib/validation";
import { MediaList, NewSourceDialog, eventLabel, type MediaListProps } from "./MemberAttachments";
import { useConfirm } from "../ConfirmDialog";
import { useLanguage, type Lang } from "@/lib/i18n";
import { MESSAGES, type MessageKey } from "@/lib/messages";

interface Props {
  tree: TreeDTO;
  busy: boolean;
  /** The source shown on the right (kept by the workspace, so it survives undo). */
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onCreate: (input: CreateSourceInput) => Promise<TreeDTO | null>;
  onUpdate: (id: string, input: UpdateSourceInput) => Promise<unknown>;
  onDelete: (id: string) => Promise<unknown>;
  onMerge: (fromId: string, intoId: string) => Promise<unknown>;
  onRemoveCitation: (id: string) => void;
  /** Shows a person in the side panel. */
  onOpenMember: (id: string) => void;
  media: Omit<MediaListProps, "files" | "ownerName" | "busy" | "onAddMedia"> & {
    onAddMedia: (sourceId: string, input: { url: string; fileType: string; caption: string | null }) => Promise<unknown>;
  };
}

type Sort = "title" | "most" | "unused";
/** A count in the interface's language ("3 citations"; in Arabic "label: number"). */
function useCount() {
  const { t, n } = useLanguage();
  return (what: "citation" | "person" | "file" | "fileLink", v: number) => t(`count.${what}.${v === 1 ? "one" : "many"}` as MessageKey, { n: n(v) });
}
/** A source as named in a confirmation: duplicates often differ only by author. */
const named = (s: SourceDTO, lang: Lang) => {
  const [o, c] = lang === "ar" ? ["«", "»"] : ['"', '"'];
  return `${o}${s.title}${c}${s.author ? ` (${s.author})` : ""}`;
};

/**
 * Every source of the family: what each one supports, its files, and the
 * tools to keep the list clean (edit, merge duplicates, delete). Each change
 * is one undo step, like any other edit.
 */
export function SourcesPage(props: Props) {
  const { tree, busy, selectedId, onSelect } = props;
  const uid = useId();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("title");
  const [creating, setCreating] = useState(false);
  const usage = useMemo(() => sourceUsage(tree), [tree]);
  const { t, n } = useLanguage();
  const count = useCount();

  const list = useMemo(() => {
    const q = normalizeName(query.trim());
    const matches = (s: SourceDTO) =>
      !q || [s.title, s.author, s.publication].some((f) => f && normalizeName(f).includes(q));
    const by: Record<Sort, (a: SourceDTO, b: SourceDTO) => number> = {
      title: (a, b) => a.title.localeCompare(b.title, "ar"),
      most: (a, b) => usage.get(b.id)!.citations - usage.get(a.id)!.citations || a.title.localeCompare(b.title, "ar"),
      unused: (a, b) => usage.get(a.id)!.citations - usage.get(b.id)!.citations || a.title.localeCompare(b.title, "ar"),
    };
    return tree.sources.filter(matches).sort(by[sort]);
  }, [tree.sources, query, sort, usage]);

  // keep a source selected: the first one, or the next after a delete or merge
  const selected = tree.sources.find((s) => s.id === selectedId) ?? null;
  useEffect(() => {
    if (!selected && list.length) onSelect(list[0].id);
  }, [selected, list, onSelect]);

  return (
    <div className="flex h-full min-h-0">
      <section aria-labelledby={`${uid}-h`} className="flex w-80 shrink-0 flex-col border-e border-parchment-300 bg-white">
        <div className="space-y-2 border-b border-parchment-200 p-3 ps-7">{/* (clear of the list's fold tab) */}
          <div className="flex items-center gap-2">
            <h2 id={`${uid}-h`} className="flex-1 text-sm font-semibold uppercase tracking-wide text-bark-500">
              {t("view.sources", { n: n(tree.sources.length) })}
            </h2>
            <button type="button" className="btn-primary py-1 text-sm" onClick={() => setCreating(true)}>{t("sources.new")}</button>
          </div>
          <input
            className="input py-1 text-sm" dir="auto" type="search" placeholder={t("sources.search")}
            aria-label={t("sources.searchLabel")} value={query} onChange={(e) => setQuery(e.target.value)}
          />
          <label className="flex items-center gap-2 text-xs text-gray-600">
            {t("sources.order")}
            <select className="input w-auto py-0.5 text-xs" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
              <option value="title">{t("sources.byTitle")}</option>
              <option value="most">{t("sources.mostCited")}</option>
              <option value="unused">{t("sources.unusedFirst")}</option>
            </select>
          </label>
        </div>
        <ul className="min-h-0 flex-1 overflow-auto" aria-label={t("sources.list")}>
          {tree.sources.length === 0 && (
            <li className="p-6 text-center text-sm text-gray-500">
              {t("sources.none")}
            </li>
          )}
          {tree.sources.length > 0 && list.length === 0 && <li className="p-4 text-sm text-gray-500">{t("sources.noMatch")}</li>}
          {list.map((s) => {
            const u = usage.get(s.id)!;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  aria-current={s.id === selectedId ? "true" : undefined}
                  onClick={() => onSelect(s.id)}
                  className={`block w-full border-b border-parchment-100 px-3 py-2 text-start hover:bg-parchment-50 ${s.id === selectedId ? "bg-parchment-100" : ""}`}
                >
                  <bdi className="block truncate font-medium">{s.title}</bdi>
                  {s.author && <bdi className="block truncate text-xs text-gray-600">{s.author}</bdi>}
                  <span className="mt-0.5 block text-xs text-gray-500">
                    {u.citations ? `${count("citation", u.citations)} · ${count("person", u.people)}` : <span className="text-amber-700">{t("sources.notCited")}</span>}
                    {u.media > 0 && ` · ${count("file", u.media)}`}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="min-w-0 flex-1 overflow-auto bg-parchment-50 p-6">
        {selected ? <SourceDetail key={selected.id} {...props} source={selected} /> : (
          <p className="text-sm text-gray-500">{t("sources.select")}</p>
        )}
      </div>

      {creating && (
        <NewSourceDialog
          busy={busy}
          onCancel={() => setCreating(false)}
          onCreate={async (input) => {
            const before = new Set(tree.sources.map((x) => x.id));
            const next = await props.onCreate(input);
            const created = next?.sources.find((x) => !before.has(x.id));
            if (created) {
              onSelect(created.id);
              setCreating(false);
            }
          }}
        />
      )}
    </div>
  );
}

function SourceDetail({ tree, busy, source, onUpdate, onDelete, onMerge, onRemoveCitation, onOpenMember, onSelect, media }: Props & { source: SourceDTO }) {
  const uid = useId();
  const id = (f: string) => `${uid}-${f}`;
  const blank = { title: source.title, author: source.author ?? "", publication: source.publication ?? "", notes: source.notes ?? "" };
  const [d, setD] = useState(blank);
  // an undo or another change of this source shows its saved values again
  useEffect(() => setD({ title: source.title, author: source.author ?? "", publication: source.publication ?? "", notes: source.notes ?? "" }), [source]);
  const dirty = JSON.stringify(d) !== JSON.stringify(blank);
  const text = (v: string) => v.trim() || null;
  const { t, n, lang } = useLanguage();
  const count = useCount();
  const eventName = (tag: string | null) => {
    if (tag === null) return null;
    const key = `event.${tag || "GEN"}`;
    return key in MESSAGES ? t(key as MessageKey) : eventLabel(tag);
  };

  const citations = tree.citations
    .filter((c) => c.sourceId === source.id)
    .map((c) => ({ c, member: tree.members.find((m) => m.id === c.memberId) }))
    .sort((a, b) => (a.member?.generation ?? 0) - (b.member?.generation ?? 0) || (a.member?.name ?? "").localeCompare(b.member?.name ?? "", "ar"));
  const files = tree.media.filter((m) => m.sourceId === source.id);

  // merging: likely duplicates first
  const dupes = useMemo(() => likelyDuplicates(tree, source.id), [tree, source.id]);
  const others = useMemo(
    () => [...dupes, ...tree.sources.filter((x) => x.id !== source.id && !dupes.includes(x)).sort((a, b) => a.title.localeCompare(b.title, "ar"))],
    [tree.sources, dupes, source.id],
  );
  const [into, setInto] = useState("");
  useEffect(() => setInto(dupes[0]?.id ?? ""), [dupes]);

  const { dialog, ask } = useConfirm();
  const merge = async () => {
    const target = tree.sources.find((x) => x.id === into);
    if (!target) return;
    const m = planMergeSources(tree, source.id, target.id);
    const dropped = m.dropCitationIds.length + m.dropMediaIds.length;
    const msg =
      t("sources.mergeMoves", { citations: count("citation", m.moveCitations.length), files: count("file", m.moveMedia.length) }) +
      (dropped ? t(dropped === 1 ? "sources.mergeDropped.one" : "sources.mergeDropped.many", { n: n(dropped) }) : "") +
      "\n" + t("sources.mergeThen", { name: named(source, lang) });
    if (await ask({ title: t("sources.mergeTitle", { from: named(source, lang), into: named(target, lang) }), message: msg, confirm: t("sources.merge") })) void onMerge(source.id, target.id).then(() => onSelect(target.id));
  };
  const remove = async () => {
    const msg =
      (citations.length || files.length
        ? t("sources.deleteLinked", { citations: count("citation", citations.length), files: count("fileLink", files.length) })
        : t("sources.deleteUnused")) +
      t("sources.canUndo");
    if (await ask({ title: t("sources.deleteTitle", { name: named(source, lang) }), message: msg, confirm: t("sources.deleteConfirm"), danger: true })) void onDelete(source.id).then(() => onSelect(null));
  };

  return (
    <article className="mx-auto max-w-3xl space-y-6" aria-labelledby={id("h")}>
      {dialog}
      <header>
        <h2 id={id("h")} className="text-xl font-bold text-bark-800"><bdi>{source.title}</bdi></h2>
        {source.author && <p className="text-sm text-gray-600"><bdi>{source.author}</bdi></p>}
        {dupes.length > 0 && (
          <p className="mt-1 rounded-md bg-amber-50 px-3 py-1.5 text-sm text-amber-900">
            {t("sources.sameAs")}<bdi className="font-medium">{dupes[0].title}</bdi>
            {dupes.length > 1 && t(dupes.length === 2 ? "sources.others.one" : "sources.others.many", { n: n(dupes.length - 1) })}{t("sources.mergeBelow")}
          </p>
        )}
      </header>

      <form
        className="space-y-3 rounded-lg border border-parchment-200 bg-white p-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!d.title.trim() || !dirty) return;
          void onUpdate(source.id, { title: d.title.trim(), author: text(d.author), publication: text(d.publication), notes: text(d.notes) });
        }}
      >
        <div>
          <label htmlFor={id("title")} className="mb-1 block text-xs font-medium text-bark-700">{t("sources.title")}</label>
          <input id={id("title")} className="input" dir="auto" required value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor={id("author")} className="mb-1 block text-xs font-medium text-bark-700">{t("sources.author")}</label>
            <input id={id("author")} className="input" dir="auto" value={d.author} onChange={(e) => setD({ ...d, author: e.target.value })} />
          </div>
          <div>
            <label htmlFor={id("pub")} className="mb-1 block text-xs font-medium text-bark-700">{t("sources.publication")}</label>
            <input id={id("pub")} className="input" dir="auto" placeholder={t("sources.publicationHint")} value={d.publication} onChange={(e) => setD({ ...d, publication: e.target.value })} />
          </div>
        </div>
        <div>
          <label htmlFor={id("notes")} className="mb-1 block text-xs font-medium text-bark-700">{t("sources.notes")}</label>
          <textarea id={id("notes")} className="input min-h-[70px]" dir="auto" value={d.notes} onChange={(e) => setD({ ...d, notes: e.target.value })} />
        </div>
        <div className="flex gap-2">
          <button type="submit" className="btn-primary" disabled={busy || !dirty || !d.title.trim()}>{t("sources.save")}</button>
          {dirty && <button type="button" className="btn-ghost" onClick={() => setD(blank)}>{t("sources.discard")}</button>}
        </div>
      </form>

      <section aria-labelledby={id("cites")} className="space-y-2">
        <h3 id={id("cites")} className="section-title">
          {t("sources.citedFor", { people: count("person", new Set(citations.map((x) => x.c.memberId)).size), citations: count("citation", citations.length) })}
        </h3>
        {citations.length === 0 ? (
          <p className="text-sm text-gray-500">{t("sources.notCitedYet")}</p>
        ) : (
          <table className="w-full overflow-hidden rounded-lg border border-parchment-200 bg-white text-sm">
            <thead className="bg-parchment-100 text-start text-xs text-bark-700">
              <tr>
                <th scope="col" className="px-3 py-1.5 text-start font-medium">{t("sources.person")}</th>
                <th scope="col" className="px-3 py-1.5 text-start font-medium">{t("sources.for")}</th>
                <th scope="col" className="px-3 py-1.5 text-start font-medium">{t("sources.page")}</th>
                <th scope="col" className="w-8"><span className="sr-only">{t("sources.remove")}</span></th>
              </tr>
            </thead>
            <tbody>
              {citations.map(({ c, member }) => (
                <tr key={c.id} className="border-t border-parchment-100" data-testid="source-citation">
                  <td className="px-3 py-1.5">
                    {member ? (
                      <button type="button" className="text-start font-naskh text-[15px] text-bark-800 underline-offset-2 hover:underline" onClick={() => onOpenMember(member.id)}>
                        <bdi>{nasab(tree.members, member.id, 3)}</bdi>
                      </button>
                    ) : "?"}
                  </td>
                  <td className="px-3 py-1.5">{eventName(c.eventType) ?? <span className="text-bark-400">{t("sources.inGeneral")}</span>}</td>
                  <td className="px-3 py-1.5"><bdi>{c.page ?? ""}</bdi></td>
                  <td className="px-1">
                    <button type="button" className="btn-ghost px-1 text-xs" disabled={busy} aria-label={t("sources.removeCitation", { name: member?.name ?? t("sources.thisPerson") })} onClick={() => onRemoveCitation(c.id)}>
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <div className="rounded-lg border border-parchment-200 bg-white p-4">
        <MediaList
          {...media}
          files={files}
          ownerName={source.title}
          busy={busy}
          onAddMedia={(input) => media.onAddMedia(source.id, input)}
        />
      </div>

      <section aria-labelledby={id("tidy")} className="space-y-3 rounded-lg border border-parchment-200 bg-white p-4">
        <h3 id={id("tidy")} className="section-title">{t("sources.tidy")}</h3>
        {others.length > 0 && (
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-0 flex-1">
              <label htmlFor={id("into")} className="mb-1 block text-xs font-medium text-bark-700">
                {t("sources.mergeInto")}
              </label>
              <select id={id("into")} className="input py-1 text-sm" dir="auto" value={into} onChange={(e) => setInto(e.target.value)}>
                <option value="">{t("sources.chooseKeep")}</option>
                {others.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.title}{x.author ? ` — ${x.author}` : ""}{dupes.includes(x) ? t("sources.looksSame") : ""}
                  </option>
                ))}
              </select>
            </div>
            <button type="button" className="btn-outline" disabled={busy || !into} onClick={merge}>{t("sources.merge")}</button>
          </div>
        )}
        <p className="text-xs text-gray-500">
          {t("sources.mergeNote")}
        </p>
        <button type="button" className="btn-danger" disabled={busy} onClick={remove}>{t("sources.delete")}</button>
      </section>
    </article>
  );
}
