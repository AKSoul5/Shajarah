// The GEDCOM and family-outline readers' warnings. They stay plain English
// text where they are made (the reader runs on the server, in a worker and
// in tests, and a warning may come back as a server error), written from
// the texts in messages.ts; the interface turns each one back into its
// text and shows it in the person's language.

import { MESSAGES, type MessageKey } from "./messages";

type Vars = Record<string, string | number>;
const fill = (s: string, vars: Vars = {}) => s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));

/** A warning in English, as the readers record it. */
export function warning(key: MessageKey, vars?: Vars): string {
  return fill(MESSAGES[key].en, vars);
}

/** A counted warning: `{base}.one` or `{base}.many`, with {n}. */
export function countedWarning(base: "gedcom.badLines" | "gedcom.multiParents" | "gedcom.missingSources" | "gedcom.missingFiles" | "gedcom.unplaced" | "gedcom.cycles", n: number): string {
  return warning(`${base}.${n === 1 ? "one" : "many"}` as MessageKey, { n });
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const PATTERNS = (Object.keys(MESSAGES) as MessageKey[])
  .filter((k) => k.startsWith("gedcom.") || k.startsWith("outline.") || k === "files.tooLarge" || k === "files.unreadable")
  .map((key) => {
    const names: string[] = [];
    const source = MESSAGES[key].en.split(/(\{\w+\})/).map((part) => {
      const name = part.match(/^\{(\w+)\}$/)?.[1];
      if (!name) return escape(part);
      names.push(name);
      return name === "n" || name === "line" ? "(\\d+)" : "(.+?)";
    }).join("");
    return { key, names, re: new RegExp(`^${source}$`, "s") };
  });

/**
 * A reader's warning in the given language: the text it was written from,
 * with the same details (numbers in the language's digits). A text that is
 * not one of the readers' warnings (a server's own error) is kept as it is.
 */
export function localizeWarning(text: string, lang: "en" | "ar", digits: (n: number) => string = String): string {
  if (lang === "en") return text;
  for (const { key, names, re } of PATTERNS) {
    const m = re.exec(text);
    if (!m) continue;
    const vars: Vars = {};
    names.forEach((name, i) => { vars[name] = name === "n" || name === "line" ? digits(Number(m[i + 1])) : m[i + 1]; });
    return fill(MESSAGES[key][lang], vars);
  }
  return text;
}
