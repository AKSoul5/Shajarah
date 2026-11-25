import { readFileSync } from "node:fs";
import { replayLayout } from "@/lib/layout/botanical";
import { makeCase } from "./cases";
import { metrics } from "./metrics";
const file = process.argv[2];
const { key, recipe } = JSON.parse(readFileSync(file, "utf8"));
const c = makeCase(key);
const l = replayLayout(c.tree, recipe);
console.log(JSON.stringify({ key, cfg: process.env.CFG, ...metrics(l) }));
