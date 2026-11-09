"""Grades the poster stress test's results (tests/stress/README.md).

    python3 -I tests/stress/grade.py <results dir>

Each case gets PASS / FAIL / LIMITATION for genealogy, layout, readability,
page fit, export and performance, and an overall result (performance is
reported on its own: a slow poster is not a wrong one). The thresholds are
the project's own: the legible minimum the layout reports (3.2 mm), the
clarity and layout-QA defects, the tree-shape limits of tests/shape.test.ts,
and the speed budget of tests/bench (2.5 s for 350 people on A1).
LIMITATION is never a pass: it means the poster is clean but its names are
below the legible size, and a larger paper is clean and legible (the editor
then recommends it); or that the poster follows the mother's line from a
man, so his children with recorded mothers are not drawn (the editor warns). Writes <dir>/grades.json and prints a summary.
"""
import json
import sys
from collections import Counter, defaultdict
from pathlib import Path

ORDER = ["A3", "A2", "A1", "A0"] + [f"{2 ** i}A0" for i in range(1, 11)]
LAYOUT_DEFECTS = ["occlusion", "crossing", "merge", "junction", "label-overlap", "soil-text-overlap", "soil-over-canopy", "soil-over-key"]
GENEALOGY_DEFECTS = ["missing", "misattached", "trunk-order"]
BUDGET_MS = 2500  # tests/bench: 350 people on A1


def load(d: Path):
    rows = []
    for part in ("primary", "designs", "modes"):
        f = d / f"{part}.jsonl"
        if f.exists():
            for line in f.read_text().splitlines():
                if line.strip():
                    r = json.loads(line)
                    r["part"] = part
                    rows.append(r)
    return rows


def grade(r):
    c = r.get("counts") or {}
    why = defaultdict(list)
    if r.get("error"):
        why["export"].append("error: " + r["error"][:120])
        return {k: "FAIL" for k in ("genealogy", "layout", "readability", "pageFit", "export")}, why
    g = {}
    for k in GENEALOGY_DEFECTS:
        if c.get(k):
            why["genealogy"].append(f"{k} x{c[k]}")
    if r.get("missingPeople"):
        why["genealogy"].append(f"not drawn x{len(r['missingPeople'])}")
    if r.get("duplicates"):
        why["genealogy"].append(f"drawn twice x{len(r['duplicates'])}")
    if r.get("siblingOrder"):
        why["genealogy"].append(f"siblings out of order x{len(r['siblingOrder'])}")
    g["genealogy"] = "FAIL" if why["genealogy"] else "PASS"
    # A mother's-line poster from a man: his children whose mothers are
    # recorded belong to their mothers' lines and are not drawn from him. The
    # poster is all but empty by the rule, not by a fault: LIMITATION, never
    # PASS (the editor warns of it). (Rows recorded before the field: every
    # stress family is rooted at a man, so the lineage says it.)
    male_root = r.get("maleRootMothersLine", r["spec"].get("lineage") == "MATRILINEAL")
    if male_root:
        g["genealogy"] = "LIMITATION"
        why["genealogy"] = ["mother's line from a man: his children with recorded mothers are not drawn"]
    for k in LAYOUT_DEFECTS:
        if c.get(k):
            why["layout"].append(f"{k} x{c[k]}")
    if r.get("overlaps"):
        why["layout"].append(f"overlapping names x{r['overlaps']}")
    if r.get("clearCrossings"):
        why["layout"].append(f"clear crossings x{r['clearCrossings']}")
    g["layout"] = "FAIL" if why["layout"] else "PASS"
    if r.get("truncated"):
        why["readability"].append(f"names cut short x{len(r['truncated'])}")
    g["readability"] = "FAIL" if why["readability"] else ("PASS" if r.get("legible") else "SMALL")
    if not r.get("legible"):
        why["readability"].append(f"names {r.get('textMm')} mm < {r.get('minMm')} mm")
    s = r.get("shape") or {}
    if r.get("offPage"):
        why["pageFit"].append(f"off the page x{len(r['offPage'])}")
    if s.get("droop", 0) > 0.15:
        why["pageFit"].append(f"canopy hangs (droop {s['droop']:.2f})")
    if s.get("lean", 0) >= 0.2:
        why["pageFit"].append(f"crown swung aside (lean {s['lean']:.2f})")
    if s.get("sides", 0) >= 0.15:
        why["pageFit"].append(f"one side heavier ({s['sides']:.2f})")
    if s and s.get("trunk", 1) <= 0.12:
        why["pageFit"].append(f"stub of a trunk ({s['trunk']:.2f})")
    g["pageFit"] = "FAIL" if why["pageFit"] else "PASS"
    sv = r.get("svg") or {}
    if not sv.get("viewBox", False) and not r.get("equivalentTo"):
        why["export"].append("viewBox does not match the poster")
    if sv.get("bad"):
        why["export"].append(f"NaN/undefined attributes x{sv['bad']}")
    g["export"] = "FAIL" if why["export"] else "PASS"
    return g, why


def main():
    d = Path(sys.argv[1])
    rows = load(d)
    graded = []
    for r in rows:
        g, why = grade(r)
        people = r.get("people") or 1
        budget = BUDGET_MS * max(1.0, people / 350)
        perf = "n/a (same poster as " + r["equivalentTo"] + ")" if r.get("equivalentTo") else ("PASS" if r.get("ms", 0) <= budget else "FAIL")
        graded.append({**r, "g": g, "why": {k: v for k, v in why.items() if v}, "perf": perf, "budgetMs": budget})
    # LIMITATION: clean but small names, and a larger paper (same family, part, design, mode) is clean and legible
    def key(r):
        s = dict(r["spec"])
        s.pop("paper", None)
        return (r["part"], json.dumps(s, sort_keys=True))
    by = defaultdict(list)
    for r in graded:
        by[key(r)].append(r)
    for r in graded:
        g = r["g"]
        hard = [k for k in ("genealogy", "layout", "pageFit", "export") if g[k] == "FAIL"] + (["readability"] if g["readability"] == "FAIL" else [])
        if hard:
            r["result"] = "FAIL"
        elif g["genealogy"] == "LIMITATION":
            r["result"] = "LIMITATION"
        elif g["readability"] == "SMALL":
            p = r["spec"]["paper"]
            larger = [x for x in by[key(r)] if ORDER.index(x["spec"]["paper"]) > ORDER.index(p)]
            ok = sorted((x for x in larger if all(x["g"][k] == "PASS" for k in ("genealogy", "layout", "readability", "pageFit", "export"))), key=lambda x: ORDER.index(x["spec"]["paper"]))
            if ok:
                r["result"] = "LIMITATION"
                r["readableOn"] = ok[0]["spec"]["paper"]
            else:
                r["result"] = "FAIL"
                r["why"].setdefault("readability", []).append("no paper up to 1024A0 is clean and legible")
        else:
            r["result"] = "PASS"
    (d / "grades.json").write_text(json.dumps(graded))
    # summary
    for part in ("primary", "designs", "modes"):
        rs = [r for r in graded if r["part"] == part]
        if not rs:
            continue
        print(f"\n== {part}: {len(rs)} cases ({sum(1 for r in rs if r.get('equivalentTo'))} verified identical to a smaller paper)")
        print("   overall:", dict(Counter(r["result"] for r in rs)))
        for cat in ("genealogy", "layout", "readability", "pageFit", "export"):
            print(f"   {cat:12}", dict(Counter(r["g"][cat] for r in rs)))
        print("   performance ", dict(Counter(r["perf"] if not r["perf"].startswith("n/a") else "n/a" for r in rs)))
        reasons = Counter()
        for r in rs:
            for cat, ws in r["why"].items():
                for w in ws:
                    reasons[f"{cat}: {w.split(' x')[0].split(' (')[0].split(':')[0] if cat != 'readability' else w.split(' mm')[0].rsplit(' ', 1)[0]}"] += 1
        for k, v in reasons.most_common(25):
            print(f"     {v:5}  {k}")


if __name__ == "__main__":
    main()
