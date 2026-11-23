// A title typed as part of a name ("عبد الملك الملقب بالأمين", "Abd
// al-Rahman the Elder") was set on one line, and the name plate came out two
// or three times as wide as the names round it: at A3, a 167 px plate among
// 40 px ones, in the way of its neighbours' lines. As a laqab entered in its
// own field already is, the title is now set on the quiet second line of
// every name plate and badge (owner, 23 Nov 2026: "titles and honorifics go
// on a second line to make name plates smaller"). The name as entered is
// kept; only the poster sets it on two lines.
import { describe, expect, it } from "vitest";
import { splitTitle } from "@/lib/nasab";
import { computePosterLayout } from "@/lib/layout/botanical";
import { AR, Builder } from "@/lib/qa/fixtures";

describe("a title in a name goes on a second line", () => {
  it("finds the title at the end of a name", () => {
    expect(splitTitle("عبد الملك الملقب بالأمين")).toEqual({ name: "عبد الملك", title: "الملقب بالأمين" });
    expect(splitTitle("عبد العزيز ذو النورين")).toEqual({ name: "عبد العزيز", title: "ذو النورين" });
    expect(splitTitle("عبد الرحمن الأكبر")).toEqual({ name: "عبد الرحمن", title: "الأكبر" });
    expect(splitTitle("يوسف الأصغر")).toEqual({ name: "يوسف", title: "الأصغر" });
    expect(splitTitle("عبد الله الشيخ")).toEqual({ name: "عبد الله", title: "الشيخ" });
    expect(splitTitle("محمد رحمه الله")).toEqual({ name: "محمد", title: "رحمه الله" });
    expect(splitTitle("Abd al-Malik known as al-Amin")).toEqual({ name: "Abd al-Malik", title: "known as al-Amin" });
    expect(splitTitle("Abd al-Rahman the Elder")).toEqual({ name: "Abd al-Rahman", title: "the Elder" });
    expect(splitTitle("Abd al-Aziz Dhu al-Nurayn")).toEqual({ name: "Abd al-Aziz", title: "Dhu al-Nurayn" });
  });

  it("leaves a name without a title as it is", () => {
    for (const n of ["سليمان بن عبد الكريم", "عبد الله", "ذو الفقار", "الشيخ", "نورة السديري", "Abdullah", "Sulayman ibn Abd al-Karim"]) {
      expect(splitTitle(n)).toEqual({ name: n, title: null });
    }
  });

  it("sets the title on the second line on the poster, the plate no wider than its name", () => {
    const b = new Builder("titles", AR);
    const top = b.trunk(3);
    const head = b.person("MALE", { father: top, name: "عبد الرحمن الأكبر" });
    const sons = ["عبد الملك الملقب بالأمين", "عبد العزيز ذو النورين", "عبد الرحمن الأكبر", "سالم", "فهد"];
    for (let i = 0; i < sons.length; i++) {
      const s = b.person("MALE", { father: head, order: i, name: sons[i] });
      for (let j = 0; j < 2; j++) b.person("MALE", { father: s, order: j });
    }
    const tree = b.tree("شجرة", head);
    const l = computePosterLayout(tree, { paperWidthMm: 594, showFemales: false });
    const plate = (name: string) => l.nodes.find((n) => n.label === name);
    const amin = plate("عبد الملك")!;
    expect(amin, "the plate shows the name without its title").toBeDefined();
    expect(amin.subLabel).toBe("الملقب بالأمين");
    expect(plate("عبد الرحمن")!.subLabel).toBe("الأكبر");
    expect(l.nodes.some((n) => n.label.includes("الملقب"))).toBe(false);
    // the canopy base's own badge too
    expect(l.base!.label).toBe("عبد الرحمن");
    expect(l.base!.subLabel).toBe("الأكبر");
    // no middle dot in Arabic
    expect(l.nodes.every((n) => !(n.subLabel ?? "").includes("·"))).toBe(true);
  });
});
