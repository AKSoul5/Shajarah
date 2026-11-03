"use client";

import { useMemo, useState } from "react";
import { applyNasabLines } from "@/lib/nasab";
import type { TreeDTO } from "@/lib/types";
import { useLanguage } from "@/lib/i18n";

interface Props {
  tree: TreeDTO;
  busy: boolean;
  onImport: (text: string) => void;
  onCancel: () => void;
}

/** Paste "خالد بن سعد بن …" lines; shows what will be reused vs created. */
export function NasabImport({ tree, busy, onImport, onCancel }: Props) {
  const [text, setText] = useState("");
  const { t, n } = useLanguage();
  // Simulate the lines in order, so later lines see people added by earlier ones.
  const preview = useMemo(() => {
    let n = 0;
    return applyNasabLines(tree.members, tree.lineage, text, () => `preview-${n++}`, tree.rootMemberId).results;
  }, [text, tree.members, tree.lineage, tree.rootMemberId]);

  return (
    <div className="min-h-0 flex-1 space-y-3 overflow-auto p-4">
      <div className="flex items-center gap-2">
        <button type="button" className="btn-ghost px-2" onClick={onCancel}>{t("nav.all")}</button>
        <h2 className="text-base font-semibold text-bark-900">{t("nasab.title")}</h2>
      </div>
      <p className="text-sm text-gray-600">{t("nasab.note")}</p>
      <textarea
        className="input min-h-[220px] font-naskh text-base leading-relaxed"
        dir="rtl"
        placeholder="خالد بن سعد بن عبدالله بن محمد بن سالم … بن آدم عليه السلام"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      {preview.length > 0 && (
        <ul className="space-y-1 text-sm">
          {preview.map((p, i) => (
            <li key={i} className="rounded-md bg-parchment-50 px-2 py-1">
              <span className="font-naskh" dir="rtl">{p.newest} … {p.oldest}</span>
              <span className="ms-2 text-xs text-gray-600">
                {t("nasab.counts", { total: n(p.total), reused: n(p.reused) })}<b>{t("nasab.new", { n: n(p.created) })}</b>
              </span>
              {p.ambiguous && (
                <span className="block text-xs text-amber-700">
                  {t("nasab.ambiguous")}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <button type="button" className="btn-primary" disabled={busy || preview.length === 0} onClick={() => onImport(text)}>
          {busy ? t("files.importing") : t("files.import")}
        </button>
        <button type="button" className="btn-ghost" onClick={onCancel}>{t("files.cancel")}</button>
      </div>
    </div>
  );
}
