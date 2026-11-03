// The interface's language, last pass: the Sources page, the start page and
// the GEDCOM and family-outline readers' warnings (src/lib/importWarnings.ts).
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { MESSAGES, type MessageKey } from "@/lib/messages";
import { LanguageProvider } from "@/lib/i18n";
import { localizeWarning, warning } from "@/lib/importWarnings";
import { parseGedcom } from "@/lib/gedcom";
import { parseOutline } from "@/lib/outline";
import { SourcesPage } from "@/components/editor/SourcesPage";
import { QA_FIXTURES } from "@/lib/qa/fixtures";
import type { TreeSummary } from "@/lib/types";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: () => {}, refresh: () => {} }) }));
const { HomeView } = await import("@/app/HomeView");

(globalThis as unknown as { React: typeof React }).React = React;
const inArabic = (el: React.ReactElement) => renderToStaticMarkup(React.createElement(LanguageProvider, { initial: "ar", children: el }));
const noop = () => {};
const later = () => Promise.resolve(null);

describe("the last screens in Arabic", () => {
  it("the Sources page: list, details, citations, merge and delete", () => {
    const tree = QA_FIXTURES.B();
    const m = tree.members[3];
    tree.sources = [
      { id: "s1", title: "سجل الأسرة", author: "خالد", publication: null, notes: null },
      { id: "s2", title: "سجل الأسرة", author: null, publication: null, notes: null },
    ] as never;
    tree.citations = [{ id: "c1", sourceId: "s1", memberId: m.id, eventType: "BIRT", page: "12" }] as never;
    const html = inArabic(React.createElement(SourcesPage, {
      tree, busy: false, selectedId: "s1", onSelect: noop, onCreate: later, onUpdate: later, onDelete: later, onMerge: later,
      onRemoveCitation: noop, onOpenMember: noop,
      media: { onAddMedia: later, onUpload: later, onRemoveMedia: noop, onUpdateMedia: later } as never,
    }));
    for (const s of ["المصادر (٢)", "＋ مصدر جديد", "حفظ المصدر", "الدمج أو الحذف", "حذف المصدر", "الميلاد", "يبدو أنه المصدر نفسه", "توثيقات: ١"]) expect(html).toContain(s);
    expect(html).not.toMatch(/>(Sources|Title \*|Author|Notes|Person|Merge|Delete source|Save source)</);
    expect(html).not.toMatch(/>[^<]*(citation|not cited|Looks like)/);
  });

  it("the start page, with families and without, and when the database is down", () => {
    const trees: TreeSummary[] = [
      { id: "t1", name: "آل سالم", title: null, memberCount: 12, updatedAt: new Date(Date.now() - 3 * 3600e3).toISOString(), pinned: false } as never,
    ];
    const first = inArabic(React.createElement(HomeView, { trees: [], dbError: null }));
    const back = inArabic(React.createElement(HomeView, { trees, dbError: null }));
    const down = inArabic(React.createElement(HomeView, { trees: [], dbError: "connect ECONNREFUSED" }));
    expect(first).toContain("ابدأ عائلتك");
    expect(first).toContain("العربية أولًا");
    expect(first).toContain("إنشاء العائلة");
    expect(back).toContain("ابدأ عائلة أخرى");
    expect(back).toContain("أشخاص: ١٢");
    expect(back).toContain("قبل ٣ ساعات");
    expect(down).toContain("تعذّر الوصول إلى قاعدة البيانات");
    expect(down).toContain("<code dir=\"ltr\">npm run db:migrate</code>");
    for (const html of [first, back, down]) {
      expect(html).not.toMatch(/Start your family|Create the family|Your families|Recently edited|people ·|Could not reach|botanical poster/);
    }
  });
});

describe("the readers' warnings", () => {
  const keys = (Object.keys(MESSAGES) as MessageKey[]).filter((k) => k.startsWith("gedcom.") || k.startsWith("outline."));
  const sample = { n: 3, line: 7, label: "4", field: "عم: سعد", charset: "ANSEL" };

  it("every warning, as recorded in English, is shown in Arabic with its details", () => {
    expect(keys.length).toBeGreaterThan(15);
    for (const key of keys) {
      const en = warning(key, sample);
      const ar = localizeWarning(en, "ar", (v) => v.toLocaleString("ar-EG"));
      expect(ar, key).toBe(MESSAGES[key].ar.replace(/\{(\w+)\}/g, (_, k: keyof typeof sample) => (k === "n" || k === "line" ? Number(sample[k]).toLocaleString("ar-EG") : String(sample[k]))));
      expect(localizeWarning(en, "en"), key).toBe(en);
    }
  });

  it("the readers write these texts: a broken GEDCOM file and a faulty outline", () => {
    const ged = parseGedcom("0 HEAD\n1 CHAR UTF-8\nnot a line\n0 @I1@ INDI\n1 NAME سعد\n0 TRLR\n");
    expect(ged.warnings).toContain("1 line could not be read and was skipped.");
    expect(ged.warnings.map((w) => localizeWarning(w, "ar"))).toContain("أسطر تعذّرت قراءتها فتُركت: 1.");
    const outline = parseOutline("سعد | أم: نورة\n  خالد | عم: فهد");
    const ar = outline.warnings.map((w) => localizeWarning(w, "ar"));
    expect(ar).toContain("السطر 1: ذُكرت والدة لشخص لا أحد فوقه في المخطط.");
    expect(ar.some((w) => w.startsWith("السطر 2: «عم: فهد»"))).toBe(true);
  });

  it("a text that is not a reader's warning is kept as it is", () => {
    expect(localizeWarning("The server answered 500", "ar")).toBe("The server answered 500");
  });
});
