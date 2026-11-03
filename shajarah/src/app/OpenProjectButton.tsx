"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { openProjectFile } from "@/components/projectFiles";
import { PROJECT_EXTENSION } from "@/lib/project";
import { fileOf, useDesktopCommands } from "@/lib/desktop";
import { useLanguage } from "@/lib/i18n";

/** Opens a saved project file (.shajarah) as a new family. */
export function OpenProjectButton() {
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { t } = useLanguage();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const open = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      router.push(`/trees/${await openProjectFile(file)}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    } finally {
      if (input.current) input.current.value = "";
    }
  };
  // (a project chosen in the desktop menu's Open dialog)
  useDesktopCommands({ "open-project": ({ file }) => file && void open(fileOf(file, "application/json")) });
  return (
    <div className="space-y-2">
      <input ref={input} type="file" accept={`${PROJECT_EXTENSION},application/json`} className="hidden" onChange={(e) => void open(e.target.files?.[0])} />
      <button type="button" className="btn-outline w-full justify-center" disabled={busy} onClick={() => input.current?.click()}>
        {busy ? t("openProject.opening") : t("openProject.choose")}
      </button>
      {error && <p className="text-sm text-red-700">{error}</p>}
    </div>
  );
}
