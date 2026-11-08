// Where the family database lives, and what state its folder is in.
//
// The one rule: nothing here deletes, overwrites, moves or renames a
// database folder or a password file that already exists. Earlier versions
// (up to 1.0.51) deleted the whole `cluster` folder when its PG_VERSION
// file was missing, which destroys a database that is otherwise complete.
//
// Layout of <userData>/database:
//   cluster\                the folder every version up to 1.0.51 used; never moved
//   password                its password; never overwritten
//   clusters\<id>\          every database folder created from 1.0.52 on
//   clusters\<id>.password  its password, written once
//   active.json             which folder is in use (absent: the legacy `cluster`)
//
// The only files this module ever replaces are its own: active.json (via a
// new temporary file and a rename) and nothing else.

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

/** The PostgreSQL the app ships (`@embedded-postgres/*` 16.x). */
const PG_MAJOR = "16";
const PG_CONTROL_SIZE = 8192;
const PG_CONTROL_VERSION = 1300; // PostgreSQL 13 to 17 use 1300
const PG16_CATALOG = 202307071;

const POINTER_FORMAT = 1;

function layout(dataDir) {
  return {
    dataDir,
    legacyCluster: path.join(dataDir, "cluster"),
    legacyPassword: path.join(dataDir, "password"),
    clustersDir: path.join(dataDir, "clusters"),
    pointer: path.join(dataDir, "active.json"),
  };
}

/** A path inside the data folder, from its relative form in active.json. */
function inside(dataDir, rel) {
  if (typeof rel !== "string" || !rel || path.isAbsolute(rel)) return null;
  const full = path.resolve(dataDir, rel);
  const root = path.resolve(dataDir) + path.sep;
  return full.startsWith(root) ? full : null;
}

/**
 * active.json, or null when there is none. A pointer that cannot be read is
 * reported, never guessed around or replaced.
 */
function readPointer(dataDir) {
  const file = layout(dataDir).pointer;
  if (!fs.existsSync(file)) return null;
  let p;
  try {
    p = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (err) {
    return { damaged: `active.json cannot be read: ${err.message}` };
  }
  const dir = inside(dataDir, p?.active);
  const passwordFile = inside(dataDir, p?.password);
  if (p?.format !== POINTER_FORMAT || !dir || !passwordFile) return { damaged: "active.json does not name a database folder inside the data folder" };
  return { dir, passwordFile, history: Array.isArray(p.history) ? p.history : [] };
}

/** The database folder in use and its password file. */
function activeCluster(dataDir) {
  const l = layout(dataDir);
  const p = readPointer(dataDir);
  if (!p) return { dir: l.legacyCluster, passwordFile: l.legacyPassword, source: "legacy" };
  if (p.damaged) return { dir: null, passwordFile: null, source: "pointer", damaged: p.damaged };
  return { dir: p.dir, passwordFile: p.passwordFile, source: "pointer" };
}

/** Points the app at another folder (one this module created or adopted). The only file replaced is active.json. */
function writePointer(dataDir, dir, passwordFile, reason) {
  const l = layout(dataDir);
  const rel = (f) => path.relative(dataDir, f).split(path.sep).join("/");
  if (!inside(dataDir, rel(dir)) || !inside(dataDir, rel(passwordFile))) throw new Error("A database folder must be inside the data folder.");
  const old = readPointer(dataDir);
  const history = [...(old && !old.damaged ? old.history : []),
    { at: new Date().toISOString(), active: rel(dir), password: rel(passwordFile), reason }].slice(-50);
  const tmp = `${l.pointer}.${crypto.randomBytes(4).toString("hex")}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify({ format: POINTER_FORMAT, active: rel(dir), password: rel(passwordFile), history }, null, 2), { flag: "wx" });
  fs.renameSync(tmp, l.pointer); // own-file: active.json, replaced atomically
}

/** The first 16 bytes of global/pg_control: its size and version fields (little-endian, as on x64). */
function readControl(dir) {
  const file = path.join(dir, "global", "pg_control");
  let fd;
  try {
    const { size } = fs.statSync(file);
    fd = fs.openSync(file, "r");
    const b = Buffer.alloc(16);
    fs.readSync(fd, b, 0, 16, 0);
    return { size, controlVersion: b.readUInt32LE(8), catalogVersion: b.readUInt32LE(12) };
  } catch {
    return null;
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }
}

/**
 * The state of a database folder, read without changing anything:
 *   none · empty          → a new database may be created (in a new folder)
 *   ready                 → start it
 *   marker-missing        → a complete database whose PG_VERSION is missing
 *   incomplete            → set-up never finished (no pg_control): it never ran, so it holds no families
 *   password-missing      → a database whose password file is gone
 *   unknown-version       → not the PostgreSQL this app ships
 *   pointer-damaged       → active.json cannot be used
 */
function classify(target) {
  if (target.damaged) return { kind: "pointer-damaged", detail: target.damaged };
  const { dir, passwordFile } = target;
  if (!fs.existsSync(dir)) return { kind: "none" };
  if (!fs.statSync(dir).isDirectory()) return { kind: "unknown-version", detail: `${dir} is not a folder` };
  if (fs.readdirSync(dir).length === 0) return { kind: "empty" };
  const hasVersion = fs.existsSync(path.join(dir, "PG_VERSION"));
  const control = readControl(dir);
  if (!control) return { kind: "incomplete", hasVersion };
  if (control.size !== PG_CONTROL_SIZE || control.controlVersion !== PG_CONTROL_VERSION) {
    return { kind: "unknown-version", detail: `pg_control version ${control.controlVersion}, size ${control.size}` };
  }
  if (!hasVersion) return { kind: "marker-missing", catalogVersion: control.catalogVersion, repairable: control.catalogVersion === PG16_CATALOG };
  const version = fs.readFileSync(path.join(dir, "PG_VERSION"), "utf8").trim();
  if (version !== PG_MAJOR || control.catalogVersion !== PG16_CATALOG) {
    return { kind: "unknown-version", detail: `PostgreSQL ${version} (catalog ${control.catalogVersion}); this app runs ${PG_MAJOR}` };
  }
  if (!fs.existsSync(passwordFile)) return { kind: "password-missing" };
  return { kind: "ready" };
}

/** A new, unique folder name under clusters\ (never one that exists). */
function newClusterId() {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  return `${stamp}-${crypto.randomBytes(3).toString("hex")}`;
}

function clusterPaths(dataDir, id) {
  const { clustersDir } = layout(dataDir);
  return {
    dir: path.join(clustersDir, id),
    staging: path.join(clustersDir, `${id}.setup`),
    passwordFile: path.join(clustersDir, `${id}.password`),
  };
}

/** Writes a new password file; refuses (EEXIST) rather than overwrite one. */
function createPasswordFile(file, password = crypto.randomBytes(24).toString("hex")) {
  fs.writeFileSync(file, password, { mode: 0o600, flag: "wx" });
  return password;
}

/** sha256 and size of every file under `dir`, keyed by its relative path. */
function fingerprint(dir, { skip = () => false } = {}) {
  const out = {};
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, e.name);
      const rel = path.relative(dir, full).split(path.sep).join("/");
      if (skip(rel)) continue;
      if (e.isDirectory()) walk(full);
      else if (e.isFile()) out[rel] = { size: fs.statSync(full).size, sha256: crypto.createHash("sha256").update(fs.readFileSync(full)).digest("hex") };
    }
  };
  walk(dir);
  return out;
}

/** Copies a folder to a destination that must not exist, and proves the copy identical. */
function verifiedCopy(src, dest) {
  if (fs.existsSync(dest)) throw new Error(`${dest} already exists.`);
  const before = fingerprint(src);
  fs.cpSync(src, dest, { recursive: true, errorOnExist: true, force: false, preserveTimestamps: true });
  // folders keep their permissions too (PostgreSQL refuses a data folder others can read)
  const modes = (d) => {
    fs.chmodSync(path.join(dest, path.relative(src, d)), fs.statSync(d).mode & 0o777);
    for (const e of fs.readdirSync(d, { withFileTypes: true })) if (e.isDirectory()) modes(path.join(d, e.name));
  };
  modes(src);
  const copy = fingerprint(dest);
  const after = fingerprint(src);
  const same = (a, b) => JSON.stringify(Object.entries(a).sort()) === JSON.stringify(Object.entries(b).sort());
  if (!same(before, after)) throw new Error("The database folder changed while it was being copied; nothing was changed in it. Close other programs using it and try again.");
  if (!same(before, copy)) throw new Error("The copy does not match the original; the original is untouched.");
  return { files: Object.keys(copy).length, bytes: Object.values(copy).reduce((n, f) => n + f.size, 0) };
}

module.exports = {
  PG_MAJOR, PG16_CATALOG, layout, readPointer, activeCluster, writePointer, readControl, classify,
  newClusterId, clusterPaths, createPasswordFile, fingerprint, verifiedCopy,
};
