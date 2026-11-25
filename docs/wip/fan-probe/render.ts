import * as React from "react";
import { readFileSync, writeFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { replayLayout } from "@/lib/layout/botanical";
import { resolveTheme } from "@/lib/theme";
import { makeCase } from "./cases";
(globalThis as any).React = React;
(async () => {
  const { TreePoster } = await import("@/components/poster/TreePoster");
  const [file, out] = process.argv.slice(2);
  const { key, recipe } = JSON.parse(readFileSync(file, "utf8"));
  const c = makeCase(key);
  const l: any = replayLayout(c.tree, recipe);
  let svg = renderToStaticMarkup(React.createElement(TreePoster as any, { layout: l, meta: { title: c.tree.title, subtitle: null, name: "" }, theme: resolveTheme(c.tree.settings) }));
  const marks = l.clarity.issues.filter((i: any) => i.at).map((i: any) =>
    `<circle cx="${i.at.x}" cy="${i.at.y}" r="${l.width * 0.006}" fill="none" stroke="${i.kind === "crossing" ? "#e00" : i.kind === "merge" ? "#06f" : "#f90"}" stroke-width="${l.width * 0.0015}"/>`).join("");
  svg = svg.replace(/<\/svg>\s*$/, `<g>${marks}</g></svg>`);
  if (!svg.includes('xmlns:xlink')) svg = svg.replace("<svg", '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
  writeFileSync(out, svg);
  console.log(key, l.width, l.height, "issues", l.clarity.issues.length, "origin", l.origin.x.toFixed(0), l.origin.y.toFixed(0));
})();
