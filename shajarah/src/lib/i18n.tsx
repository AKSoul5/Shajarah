"use client";

// The interface's language: English or Arabic, chosen by each person on
// their own computer (browser storage; nothing about the family changes).
// Arabic lays the interface out right to left. Names and family records
// are shown as written, whatever the interface's language.
//
// Each text lives in src/lib/messages.ts in both languages; a test checks
// that none is missing in either.

import { Fragment, createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { MESSAGES, type MessageKey } from "./messages";

export type Lang = "en" | "ar";
const STORAGE_KEY = "shajarah:lang";

/** A text in the given language, with {placeholders} filled in. */
export function translate(lang: Lang, key: MessageKey, vars?: Record<string, string | number>): string {
  let s: string = MESSAGES[key][lang];
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
  return s;
}

/**
 * A translated text with parts that are not plain text (a link, a bold
 * word, a name kept in its own direction): each {placeholder} in the text
 * becomes the matching node.
 */
export function rich(text: string, nodes: Record<string, ReactNode>): ReactNode[] {
  return text.split(/(\{\w+\})/).map((part, i) => {
    const key = part.match(/^\{(\w+)\}$/)?.[1];
    return key && key in nodes ? <Fragment key={i}>{nodes[key]}</Fragment> : part;
  });
}

/** Digits as the language writes them (Arabic-Indic in Arabic). */
export const numberIn = (lang: Lang, n: number) => (lang === "ar" ? n.toLocaleString("ar-EG") : n.toLocaleString("en-US"));

interface LanguageContext {
  lang: Lang;
  dir: "ltr" | "rtl";
  setLang: (lang: Lang) => void;
  t: (key: MessageKey, vars?: Record<string, string | number>) => string;
  n: (value: number) => string;
}

const Ctx = createContext<LanguageContext>({
  lang: "en", dir: "ltr", setLang: () => {},
  t: (key, vars) => translate("en", key, vars), n: (v) => numberIn("en", v),
});

/** `initial`: the language before the person's own choice is read (tests, previews). */
export function LanguageProvider({ children, initial = "en" }: { children: ReactNode; initial?: Lang }) {
  const [lang, setLangState] = useState<Lang>(initial);
  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === "ar") setLangState("ar");
    } catch { /* storage unavailable: English */ }
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);
  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try { localStorage.setItem(STORAGE_KEY, l); } catch { /* not remembered */ }
  }, []);
  const value = useMemo<LanguageContext>(() => ({
    lang, dir: lang === "ar" ? "rtl" : "ltr", setLang,
    t: (key, vars) => translate(lang, key, vars), n: (v) => numberIn(lang, v),
  }), [lang, setLang]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useLanguage = () => useContext(Ctx);

/** A small switch between the two languages. */
export function LanguageSwitch({ className = "" }: { className?: string }) {
  const { lang, setLang } = useLanguage();
  return (
    <button type="button" className={`btn-ghost px-2 text-sm ${className}`} onClick={() => setLang(lang === "ar" ? "en" : "ar")}
      aria-label={lang === "ar" ? "Switch the interface to English" : "تحويل الواجهة إلى العربية"} lang={lang === "ar" ? "en" : "ar"}>
      {lang === "ar" ? "English" : "العربية"}
    </button>
  );
}
