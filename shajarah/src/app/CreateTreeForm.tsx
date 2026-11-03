"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useDesktopCommands, useDesktopState } from "@/lib/desktop";
import { useLanguage } from "@/lib/i18n";

export function CreateTreeForm() {
  const router = useRouter();
  const { t } = useLanguage();
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [lineage, setLineage] = useState("PATRILINEAL");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // New Family (the desktop menu, here or from a family, which comes here
  // as /#new): the family's name to type, in view
  const nameInput = useRef<HTMLInputElement>(null);
  const begin = () => {
    nameInput.current?.scrollIntoView({ block: "center" });
    nameInput.current?.focus();
  };
  useEffect(() => {
    if (window.location.hash === "#new") begin();
  }, []);
  useDesktopCommands({ "new-family": begin });
  useDesktopState({ page: "home" });

  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        const res = await fetch("/api/trees", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, title: title || null, lineage }),
        });
        const data = await res.json().catch(() => ({}));
        setBusy(false);
        if (!res.ok) return setError(data.error ?? t("create.error"));
        router.push(`/trees/${data.id}`);
      }}
    >
      <input ref={nameInput} className="input font-naskh text-base" dir="auto" required aria-label={t("create.name")} placeholder={t("create.namePlaceholder")} value={name} onChange={(e) => setName(e.target.value)} />
      <input className="input font-naskh text-base" dir="auto" aria-label={t("create.title")} placeholder={t("create.titlePlaceholder")} value={title} onChange={(e) => setTitle(e.target.value)} />
      <select className="input" aria-label={t("create.lineage")} value={lineage} onChange={(e) => setLineage(e.target.value)}>
        <option value="PATRILINEAL">{t("create.patrilineal")}</option>
        <option value="MATRILINEAL">{t("create.matrilineal")}</option>
      </select>
      {error && <p className="text-sm text-red-700">{error}</p>}
      <button className="btn-primary w-full justify-center" disabled={busy || !name.trim()}>{busy ? t("create.creating") : t("create.submit")}</button>
    </form>
  );
}
