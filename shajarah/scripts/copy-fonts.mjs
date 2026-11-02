// Copies the Amiri, Aref Ruqaa and Noto Kufi Arabic webfonts into public/fonts so that the
// poster can reference them at runtime and embed them into exported SVG/PDF.
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dest = join(root, "public/fonts");
mkdirSync(dest, { recursive: true });

// Amiri (naskh) for names and text, Aref Ruqaa (calligraphic) for headings,
// Noto Kufi Arabic (geometric) for the titles of the modern themes.
for (const family of ["amiri", "aref-ruqaa", "noto-kufi-arabic"]) {
  const src = join(root, `node_modules/@fontsource/${family}/files`);
  if (!existsSync(src)) {
    console.warn(`[copy-fonts] @fontsource/${family} not installed; skipping`);
    continue;
  }
  for (const weight of ["400", "700"]) {
    for (const subset of ["arabic", "latin"]) {
      const file = `${family}-${subset}-${weight}-normal.woff2`;
      copyFileSync(join(src, file), join(dest, file));
    }
  }
}
console.log("[copy-fonts] fonts copied to public/fonts");
