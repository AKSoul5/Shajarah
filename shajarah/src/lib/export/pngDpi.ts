// PNG resolution metadata. A canvas encodes its PNG without any, so image
// editors and print software took a 300 DPI A1 export for 72 DPI and opened
// it some 2.5 m wide. This writes the resolution the image was drawn at into
// a pHYs chunk (pixels per metre), right after the header; the pixels, and
// every other chunk, are left exactly as they are.

const SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];

let table: Uint32Array | null = null;
function crc32(bytes: Uint8Array): number {
  if (!table) {
    table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (const b of bytes) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

const u32 = (v: number) => [(v >>> 24) & 0xff, (v >>> 16) & 0xff, (v >>> 8) & 0xff, v & 0xff];

/** The PNG `png` with its resolution set to `dpi` (any earlier pHYs chunk replaced). */
export function withPngResolution(png: Uint8Array, dpi: number): Uint8Array {
  if (png.length < 33 || SIGNATURE.some((b, i) => png[i] !== b)) throw new Error("Not a PNG image");
  const ppm = Math.round(dpi / 0.0254);
  const body = new Uint8Array([...[0x70, 0x48, 0x59, 0x73] /* pHYs */, ...u32(ppm), ...u32(ppm), 1 /* metres */]);
  const chunk = new Uint8Array([...u32(9), ...body, ...u32(crc32(body))]);
  // walk the chunks: keep all but an old pHYs, and put the new one after IHDR
  const parts: Uint8Array[] = [png.subarray(0, 8)];
  let at = 8;
  while (at + 8 <= png.length) {
    const len = ((png[at] << 24) | (png[at + 1] << 16) | (png[at + 2] << 8) | png[at + 3]) >>> 0;
    const type = String.fromCharCode(png[at + 4], png[at + 5], png[at + 6], png[at + 7]);
    const end = at + 12 + len;
    if (type !== "pHYs") parts.push(png.subarray(at, end));
    if (type === "IHDR") parts.push(chunk);
    at = end;
  }
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}
