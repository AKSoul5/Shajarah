// PNG exports carry the resolution they were drawn at (pHYs), the pixels untouched.
import { describe, expect, it } from "vitest";
import { deflateSync } from "node:zlib";
import { withPngResolution } from "@/lib/export/pngDpi";

/** A minimal valid PNG: 2×1 RGB pixels. */
function tinyPng(extra: Buffer[] = []): Uint8Array {
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (b: Buffer) => { let c = 0xffffffff; for (const x of b) c = crcTable[(c ^ x) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (type: string, data: Buffer) => {
    const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const out = Buffer.alloc(12 + data.length);
    out.writeUInt32BE(data.length, 0); body.copy(out, 4); out.writeUInt32BE(crc(body), 8 + data.length);
    return out;
  };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(2, 0); ihdr.writeUInt32BE(1, 4); ihdr[8] = 8; ihdr[9] = 2;
  const idat = deflateSync(Buffer.from([0, 255, 0, 0, 0, 0, 255]));
  return new Uint8Array(Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), ...extra.map((e) => chunk("pHYs", e)), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]));
}

const chunks = (png: Uint8Array) => {
  const b = Buffer.from(png); const out: { type: string; data: Buffer; crcOk: boolean }[] = [];
  for (let at = 8; at < b.length;) {
    const len = b.readUInt32BE(at), type = b.toString("ascii", at + 4, at + 8);
    const data = b.subarray(at + 8, at + 8 + len);
    out.push({ type, data, crcOk: true });
    at += 12 + len;
  }
  return out;
};

describe("PNG resolution metadata", () => {
  for (const dpi of [150, 200, 300]) {
    it(`${dpi} DPI is written as pixels per metre, right after the header`, () => {
      const out = withPngResolution(tinyPng(), dpi);
      const cs = chunks(out);
      expect(cs.map((c) => c.type)).toEqual(["IHDR", "pHYs", "IDAT", "IEND"]);
      const p = cs[1].data;
      expect(p.readUInt32BE(0)).toBe(Math.round(dpi / 0.0254));
      expect(p.readUInt32BE(4)).toBe(Math.round(dpi / 0.0254));
      expect(p[8]).toBe(1);
      // the image data itself is untouched
      expect(cs[2].data.equals(chunks(tinyPng())[1].data)).toBe(true);
    });
  }
  it("replaces an earlier resolution rather than adding a second", () => {
    const old = Buffer.alloc(9); old.writeUInt32BE(2835, 0); old.writeUInt32BE(2835, 4); old[8] = 1;
    const cs = chunks(withPngResolution(tinyPng([old]), 300));
    expect(cs.filter((c) => c.type === "pHYs")).toHaveLength(1);
    expect(cs.find((c) => c.type === "pHYs")!.data.readUInt32BE(0)).toBe(11811);
  });
  it("refuses something that is not a PNG", () => {
    expect(() => withPngResolution(new Uint8Array(40), 300)).toThrow();
  });
});
