// The interface's two languages (src/lib/i18n.tsx, src/lib/messages.ts):
// every text in both, the same placeholders in both, and the new screens
// drawn in Arabic.
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MESSAGES } from "@/lib/messages";
import { LanguageProvider, translate, numberIn } from "@/lib/i18n";
import { PersonProfile } from "@/components/editor/PersonProfile";
import { RecordsPage } from "@/components/editor/RecordsPage";
import { PeopleFilters } from "@/components/editor/PeopleFilters";
import { ViewMenu } from "@/components/editor/ViewMenu";
import { UndoControls } from "@/components/editor/UndoControls";
import { MemberForm } from "@/components/editor/MemberForm";
import { RelationsPanel } from "@/components/editor/RelationsPanel";
import { buildFamilyIndex } from "@/lib/family/index";
import { QA_FIXTURES } from "@/lib/qa/fixtures";

(globalThis as unknown as { React: typeof React }).React = React;

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("the interface's languages", () => {
  it("every text has both an English and an Arabic version, with the same placeholders", () => {
    for (const [key, m] of Object.entries(MESSAGES)) {
      expect(m.en.trim(), key).not.toBe("");
      expect(m.ar.trim(), key).not.toBe("");
      expect(placeholders(m.ar), key).toEqual(placeholders(m.en));
    }
  });

  it("Arabic texts are Arabic (apart from the switch back to English)", () => {
    for (const [key, m] of Object.entries(MESSAGES)) if (key !== "language.switch") expect(m.ar, key).toMatch(/[؀-ۿ]/);
  });

  it("fills placeholders and writes numbers as each language does", () => {
    expect(translate("en", "row.children", { n: 3 })).toBe("Children (3)");
    expect(translate("ar", "row.children", { n: numberIn("ar", 3) })).toBe("الأبناء والبنات (٣)");
  });

  const tree = QA_FIXTURES.B();
  const ix = buildFamilyIndex(tree);
  const inArabic = (el: React.ReactElement) => renderToStaticMarkup(React.createElement(LanguageProvider, { initial: "ar", children: el }));

  it("the profile, the filters and the records view are drawn in Arabic", () => {
    const m = tree.members.find((x) => x.fatherId && x.motherId)!;
    const profile = inArabic(React.createElement(PersonProfile, { ix, tree, member: m, onOpen: () => {} }));
    expect(profile).toContain("العائلة");
    expect(profile).toContain("الوالد");
    expect(profile).not.toMatch(/>Father</);
    const filters = inArabic(React.createElement(PeopleFilters, { ix, value: {}, onChange: () => {} }));
    expect(filters).toContain("كل الفروع");
    const records = inArabic(React.createElement(RecordsPage, { ix, tree, onOpenMember: () => {} }));
    expect(records).toContain("سجلات العائلة");
    expect(records).not.toContain("Completeness");
  });

  it("the View menu and undo and redo are drawn in Arabic", () => {
    const view = inArabic(React.createElement(ViewMenu, { toggles: [] }));
    expect(view).toContain("العرض");
    expect(view).not.toContain("View");
    const step = { id: "s1", label: "إضافة سالم", at: Date.now() } as never;
    const undo = inArabic(React.createElement(UndoControls, { undo: [step], redo: [], busy: false, onUndo: () => {}, onRedo: () => {}, onUndoSteps: () => {} }));
    expect(undo).toContain("تراجع: إضافة سالم");
    expect(undo).toContain("لا شيء لإعادته");
    expect(undo).not.toMatch(/Undo|Redo|Recent/);
  });

  it("the member form and the relations panel are drawn in Arabic", () => {
    const m = tree.members.find((x) => x.fatherId && x.motherId)!;
    const noop = () => {};
    const form = inArabic(React.createElement(MemberForm, { tree, member: m, busy: false, onSave: noop, onCancel: noop, onDelete: noop }));
    expect(form).toContain("حفظ التغييرات");
    expect(form).toContain("الأب");
    expect(form).not.toMatch(/>(Save changes|Father|Notes|Born)</);
    const rel = inArabic(React.createElement(RelationsPanel, {
      tree, member: m, busy: false, onSelect: noop, onQuickAddChild: noop, onQuickAddParent: noop, onAddSpouse: noop,
      onNewSpouse: noop, onRemoveMarriage: noop, onSetParent: noop, onMerge: noop, onMove: noop,
    }));
    expect(rel).toContain("الوالدان");
    expect(rel).toContain("data-add-child");
    expect(rel).not.toMatch(/press Enter|>Parents</);
  });
});
