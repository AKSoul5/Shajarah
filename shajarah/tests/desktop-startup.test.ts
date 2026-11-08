// The desktop app's database start-up (desktop/electron/cluster.js,
// postgres.js, recovery.js): nothing that exists is ever deleted, overwritten
// or moved, and every damaged state has a way back to the families.
//
// Tests marked RED PROOF run the code shipped in 1.0.51 (kept verbatim in
// desktop/electron/test/postgres-1.0.51.js) and show the original defect
// happening, so each fix is proven against a real failure.
//
// Tests that need a real PostgreSQL use the binaries the app ships
// (@embedded-postgres, installed by `npm ci` in desktop/electron). They run
// as a normal user only (PostgreSQL refuses root). In CI, REQUIRE_PG=1 makes
// their absence a failure instead of a skip.

import { createRequire } from "node:module";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { readProjectFile, withNewIds } from "@/lib/project";
import { snapshotError } from "@/lib/restore";

const require = createRequire(import.meta.url);
const electronDir = path.resolve(__dirname, "../desktop/electron");
const cluster = require(path.join(electronDir, "cluster.js"));

const isRoot = typeof process.getuid === "function" && process.getuid() === 0;
const hasPg = (() => {
  try {
    const { binDir, EXE } = require(path.join(electronDir, "postgres.js"));
    return fs.existsSync(path.join(binDir(), `initdb${EXE}`)) && !isRoot;
  } catch {
    return false;
  }
})();
if (process.env.REQUIRE_PG === "1" && !hasPg) throw new Error("REQUIRE_PG=1 but the embedded PostgreSQL cannot run here (missing, or running as root).");
const pg = hasPg ? require(path.join(electronDir, "postgres.js")) : null;
const recovery = hasPg ? require(path.join(electronDir, "recovery.js")) : null;
const { migrate } = require(path.join(electronDir, "migrate.js"));
const Legacy = require(path.join(electronDir, "test", "postgres-1.0.51.js")).Database;

const temps: string[] = [];
const tmp = (label: string) => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), `shajarah-${label}-`));
  temps.push(d);
  return d;
};
afterAll(() => {
  for (const d of temps) fs.rmSync(d, { recursive: true, force: true });
});
const same = (a: object, b: object) => expect(JSON.stringify(Object.entries(a).sort())).toBe(JSON.stringify(Object.entries(b).sort()));

const BLOB = "a".repeat(64);
/** A family as 1.0.51 stores it: real migrations, then rows (invented names). */
async function seed(url: string) {
  await migrate(url, path.resolve(__dirname, "../prisma/migrations"));
  const { Client } = require(path.join(electronDir, "node_modules", "pg"));
  const c = new Client({ connectionString: url.replace(/\?.*$/, "") });
  await c.connect();
  try {
    await c.query(`INSERT INTO "FamilyTree"(id,name,lineage,"updatedAt",settings) VALUES ('t1','Invented family','PATRILINEAL',now(),'{"showFemales":true}')`);
    await c.query(`INSERT INTO "Member"(id,"treeId",name,gender,"birthOrder","updatedAt") VALUES
      ('m1','t1','Adam','MALE',0,now()),('m2','t1','Hawa','FEMALE',0,now()),('m3','t1','Bakr','MALE',0,now()),('m4','t1','Salma','FEMALE',1,now())`);
    await c.query(`UPDATE "Member" SET "fatherId"='m1', "motherId"='m2' WHERE id IN ('m3','m4')`);
    await c.query(`UPDATE "FamilyTree" SET "rootMemberId"='m1' WHERE id='t1'`);
    await c.query(`INSERT INTO "Marriage"(id,"treeId","spouseAId","spouseBId","startYear") VALUES ('w1','t1','m1','m2',1950)`);
    await c.query(`INSERT INTO "Source"(id,"treeId",title) VALUES ('s1','t1','Family register')`);
    await c.query(`INSERT INTO "Citation"(id,"sourceId","memberId",page) VALUES ('c1','s1','m3','p. 4')`);
    await c.query(`INSERT INTO "MediaBlob"(id,data,"fileType",size) VALUES ($1,$2,'image/png',3)`, [BLOB, Buffer.from([1, 2, 3])]);
    await c.query(`INSERT INTO "Media"(id,"treeId","memberId",url,"fileType") VALUES ('p1','t1','m3',$1,'image/png')`, [`/api/media/blob/${BLOB}`]);
  } finally {
    await c.end();
  }
}
async function familyRows(db: { url: string }) {
  const { Client } = require(path.join(electronDir, "node_modules", "pg"));
  const c = new Client({ connectionString: db.url.replace(/\?.*$/, "") });
  await c.connect();
  try {
    return (await c.query(`SELECT id, name, "fatherId", "motherId" FROM "Member" ORDER BY id`)).rows;
  } finally {
    await c.end();
  }
}
let port = 56400 + Math.floor(Math.random() * 500);

/**
 * A data folder laid out as by 1.0.51 (database/cluster + database/password)
 * holding a seeded family, made once and copied for each test.
 */
let template: string | null = null;
async function buildTemplate() {
  if (!template) {
    const dir = tmp("template");
    const dataDir = path.join(dir, "database");
    fs.mkdirSync(dataDir, { recursive: true });
    const logs = tmp("logs");
    fs.writeFileSync(path.join(dataDir, "password"), "legacy-password-1051", { mode: 0o600 });
    await pg.run(path.join(pg.binDir(), `initdb${pg.EXE}`), ["-D", path.join(dataDir, "cluster"), "-U", "shajarah",
      `--pwfile=${path.join(dataDir, "password")}`, "-A", "scram-sha-256", "-E", "UTF8", "--locale=C"], path.join(logs, "t.log"));
    fs.appendFileSync(path.join(dataDir, "cluster", "postgresql.conf"), "\nlisten_addresses = '127.0.0.1'\nunix_socket_directories = ''\n");
    const db = new pg.Database(dataDir, logs, { dir: path.join(dataDir, "cluster"), passwordFile: path.join(dataDir, "password") });
    await db.start(port++);
    try {
      await seed(db.url);
    } finally {
      await db.stop();
    }
    template = dir; // only once it is complete: a half-built template is never copied
  }
}
async function legacyDataDir() {
  if (!template) throw new Error("the 1.0.51 template database was not built");
  const copy = path.join(tmp("data"), "database");
  fs.cpSync(path.join(template, "database"), copy, { recursive: true });
  fs.chmodSync(path.join(copy, "cluster"), 0o700);
  return { dataDir: copy, logs: tmp("logs") };
}

describe("1.0.52 never deletes, overwrites or moves the database (lint E1-T8)", () => {
  it("every file write in the desktop code is exclusive or marked as the app's own file", () => {
    const risky = /\b(rmSync|unlinkSync|rmdirSync|renameSync|writeFileSync|appendFileSync|copyFileSync|cpSync|openSync)\(|\.(rm|unlink|rename|writeFile|appendFile)\(/;
    const allowed = /flag: "wx"|COPYFILE_EXCL|errorOnExist: true|\/\/ own-file: |openSync\([^)]*"r"\)/;
    const offenders: string[] = [];
    for (const f of fs.readdirSync(electronDir).filter((n) => n.endsWith(".js"))) {
      fs.readFileSync(path.join(electronDir, f), "utf8").split("\n").forEach((line, i) => {
        if (risky.test(line) && !allowed.test(line)) offenders.push(`${f}:${i + 1}: ${line.trim()}`);
      });
    }
    expect(offenders).toEqual([]);
  });

  it("the start-up code names no way to delete the legacy cluster or password", () => {
    for (const f of ["cluster.js", "postgres.js", "main.js"]) {
      const src = fs.readFileSync(path.join(electronDir, f), "utf8");
      expect(src).not.toMatch(/rmSync\([^)]*(cluster|password)/i);
    }
  });
});

describe("classification reads the folder without changing it", () => {
  const dataDir = () => path.join(tmp("cls"), "database");
  it("no folder → none; an empty folder → empty", () => {
    const d = dataDir();
    expect(cluster.classify(cluster.activeCluster(d)).kind).toBe("none");
    fs.mkdirSync(path.join(d, "cluster"), { recursive: true });
    expect(cluster.classify(cluster.activeCluster(d)).kind).toBe("empty");
  });
  it("a damaged active.json is reported, never replaced", () => {
    const d = dataDir();
    fs.mkdirSync(d, { recursive: true });
    fs.writeFileSync(path.join(d, "active.json"), "{not json");
    const before = cluster.fingerprint(d);
    expect(cluster.classify(cluster.activeCluster(d)).kind).toBe("pointer-damaged");
    same(cluster.fingerprint(d), before);
  });
  it("active.json may not point outside the data folder", () => {
    const d = dataDir();
    fs.mkdirSync(d, { recursive: true });
    fs.writeFileSync(path.join(d, "active.json"), JSON.stringify({ format: 1, active: "../../elsewhere", password: "password" }));
    expect(cluster.classify(cluster.activeCluster(d)).kind).toBe("pointer-damaged");
  });
});

// Real PostgreSQL is slow on CI's Windows runners: a single start and stop can
// take seconds. The template is built once, before the tests, under its own
// limit, so no test is charged for it.
describe.skipIf(!hasPg)("start-up with real PostgreSQL 16 (the binaries the app ships)", { timeout: 60_000 }, () => {
  beforeAll(buildTemplate, 180_000);

  it("E1-T1 RED PROOF: 1.0.51 deletes a complete family database whose PG_VERSION is missing", async () => {
    const { dataDir, logs } = await legacyDataDir();
    fs.rmSync(path.join(dataDir, "cluster", "PG_VERSION"));
    expect(fs.existsSync(path.join(dataDir, "cluster", "base"))).toBe(true);
    const old = new Legacy(dataDir, logs); // its initdb is not found, so it stops right after deleting
    await expect(old.init()).rejects.toThrow();
    expect(fs.existsSync(path.join(dataDir, "cluster", "base"))).toBe(false); // the family is gone
  });

  it("E1-T2 RED PROOF: 1.0.51 overwrites the password of that database", async () => {
    const { dataDir, logs } = await legacyDataDir();
    fs.rmSync(path.join(dataDir, "cluster", "PG_VERSION"));
    await new Legacy(dataDir, logs).init().catch(() => {});
    expect(fs.readFileSync(path.join(dataDir, "password"), "utf8")).not.toBe("legacy-password-1051");
  });

  it("E1-T1/T2: 1.0.52 changes nothing, keeps the password, and asks for recovery", async () => {
    const { dataDir, logs } = await legacyDataDir();
    fs.rmSync(path.join(dataDir, "cluster", "PG_VERSION"));
    const before = cluster.fingerprint(path.dirname(dataDir));
    const db = new pg.Database(dataDir, logs);
    const state = await db.prepare();
    expect(state.kind).toBe("marker-missing");
    expect(state.repairable).toBe(true);
    same(cluster.fingerprint(path.dirname(dataDir)), before); // every file, nothing added
    expect(fs.readFileSync(path.join(dataDir, "password"), "utf8")).toBe("legacy-password-1051");
  });

  it("E1-T3: a fresh install creates its database in a new folder of its own", async () => {
    const dataDir = path.join(tmp("fresh"), "database");
    const db = new pg.Database(dataDir, tmp("logs"));
    expect((await db.prepare()).kind).toBe("created");
    expect(db.target.dir).toMatch(/clusters[\\/]\d{14}-[0-9a-f]{6}$/);
    expect(fs.existsSync(path.join(dataDir, "cluster"))).toBe(false);
    expect(fs.readdirSync(path.join(dataDir, "clusters")).filter((n) => n.endsWith(".setup"))).toEqual([]);
    expect(cluster.readPointer(dataDir).dir).toBe(db.target.dir);
    await db.start(port++);
    await db.stop();
    // and the next start finds it ready
    const again = new pg.Database(dataDir, tmp("logs"));
    expect((await again.prepare()).kind).toBe("ready");
  });

  it("E1-T4: a 1.0.51 database upgrades in place: same folder, same password, same family, no pointer", async () => {
    const { dataDir, logs } = await legacyDataDir();
    const password = fs.readFileSync(path.join(dataDir, "password"), "utf8");
    const db = new pg.Database(dataDir, logs);
    expect((await db.prepare()).kind).toBe("ready");
    expect(db.target.dir).toBe(path.join(dataDir, "cluster"));
    await db.start(port++);
    try {
      expect((await familyRows(db)).map((r: { name: string }) => r.name).sort()).toEqual(["Adam", "Bakr", "Hawa", "Salma"]);
      expect(await migrate(db.url, path.resolve(__dirname, "../prisma/migrations"))).toEqual([]); // same schema as 1.0.51
    } finally {
      await db.stop();
    }
    expect(fs.existsSync(path.join(dataDir, "active.json"))).toBe(false);
    expect(fs.readFileSync(path.join(dataDir, "password"), "utf8")).toBe(password);
  });

  it("E1-T5 RED PROOF: 1.0.51 cannot start after an interrupted first set-up, and never recovers", async () => {
    const { dataDir, logs } = await legacyDataDir();
    fs.rmSync(path.join(dataDir, "cluster", "global", "pg_control")); // as initdb leaves it when killed early
    const old = new Legacy(dataDir, logs);
    old.bin = pg.binDir();
    await old.init(); // PG_VERSION is there, so it does nothing
    await expect(old.start(port++)).rejects.toThrow();
    await old.stop();
  });

  it("E1-T5: 1.0.52 keeps that folder untouched and offers a new database in a new folder", async () => {
    const { dataDir, logs } = await legacyDataDir();
    fs.rmSync(path.join(dataDir, "cluster", "global", "pg_control"));
    const legacy = cluster.fingerprint(path.join(dataDir, "cluster"));
    const db = new pg.Database(dataDir, logs);
    expect((await db.prepare()).kind).toBe("incomplete");
    same(cluster.fingerprint(path.join(dataDir, "cluster")), legacy);
    // the person chooses "Start a new, empty database"
    const fresh = new pg.Database(dataDir, logs);
    await fresh.createNew("test");
    same(cluster.fingerprint(path.join(dataDir, "cluster")), legacy);
    expect(fs.readFileSync(path.join(dataDir, "password"), "utf8")).toBe("legacy-password-1051");
    const next = new pg.Database(dataDir, logs);
    expect((await next.prepare()).kind).toBe("ready");
    expect(next.target.dir).not.toBe(path.join(dataDir, "cluster"));
  });

  it("E1-T6: a missing password file is reported; no new password is written for an existing database", async () => {
    const { dataDir, logs } = await legacyDataDir();
    fs.rmSync(path.join(dataDir, "password"));
    const before = cluster.fingerprint(path.dirname(dataDir));
    expect((await new pg.Database(dataDir, logs).prepare()).kind).toBe("password-missing");
    same(cluster.fingerprint(path.dirname(dataDir)), before);
  });

  it("unknown PostgreSQL version: reported, never opened", async () => {
    const { dataDir, logs } = await legacyDataDir();
    fs.writeFileSync(path.join(dataDir, "cluster", "PG_VERSION"), "15\n");
    const before = cluster.fingerprint(path.dirname(dataDir));
    expect((await new pg.Database(dataDir, logs).prepare()).kind).toBe("unknown-version");
    same(cluster.fingerprint(path.dirname(dataDir)), before);
  });

  it("E1-T7: after an ordinary 1.0.52 start, 1.0.51 still opens the same family", async () => {
    const { dataDir, logs } = await legacyDataDir();
    const db = new pg.Database(dataDir, logs);
    await db.prepare();
    await db.start(port++);
    await db.stop();
    const old = new Legacy(dataDir, logs);
    old.bin = pg.binDir();
    await old.init();
    await old.start(port++);
    try {
      expect((await familyRows(old)).length).toBe(4);
    } finally {
      await old.stop();
    }
  });

  it("E3-T1: a repaired copy is made and checked; the original stays byte-identical; nothing switches without agreement", async () => {
    const { dataDir, logs } = await legacyDataDir();
    fs.rmSync(path.join(dataDir, "cluster", "PG_VERSION"));
    const original = cluster.fingerprint(path.join(dataDir, "cluster"));
    const db = new pg.Database(dataDir, logs);
    const state = await db.prepare();
    const repair = await recovery.repairOnCopy({ dataDir, logDir: logs, source: db.target, state });
    expect(repair.counts).toEqual({ families: 1, people: 4 });
    same(cluster.fingerprint(path.join(dataDir, "cluster")), original);
    expect(fs.existsSync(path.join(dataDir, "active.json"))).toBe(false); // not adopted yet
    recovery.adoptRepair(dataDir, repair);
    same(cluster.fingerprint(path.join(dataDir, "cluster")), original);
    const next = new pg.Database(dataDir, logs);
    expect((await next.prepare()).kind).toBe("ready");
    await next.start(port++);
    try {
      expect((await familyRows(next)).length).toBe(4);
    } finally {
      await next.stop();
    }
  });

  it("E3-T1 (password): a copy gets a new password; the original and its folder are unchanged", async () => {
    const { dataDir, logs } = await legacyDataDir();
    fs.rmSync(path.join(dataDir, "password"));
    const before = cluster.fingerprint(path.dirname(dataDir));
    const db = new pg.Database(dataDir, logs);
    const state = await db.prepare();
    const repair = await recovery.repairOnCopy({ dataDir, logDir: logs, source: db.target, state });
    expect(repair.counts).toEqual({ families: 1, people: 4 });
    const after = cluster.fingerprint(path.dirname(dataDir));
    for (const [f, v] of Object.entries(before)) expect(after[f]).toEqual(v); // nothing that existed changed
    expect(fs.readFileSync(path.join(repair.staging, "pg_hba.conf"), "utf8")).toBe(fs.readFileSync(path.join(dataDir, "cluster", "pg_hba.conf"), "utf8"));
  });

  it("E4-T1: the emergency export writes project files that open, pass the validator and hold everything", async () => {
    const { dataDir, logs } = await legacyDataDir();
    const out = tmp("export");
    const written = await recovery.exportFamilies({ dataDir, logDir: logs, target: cluster.activeCluster(dataDir), outDir: out });
    expect(written).toHaveLength(1);
    const project = readProjectFile(fs.readFileSync(written[0].file, "utf8"));
    const t = project.tree;
    expect(t.members.map((m) => m.name).sort()).toEqual(["Adam", "Bakr", "Hawa", "Salma"]);
    expect(t.members.find((m) => m.name === "Bakr")).toMatchObject({ fatherId: "m1", motherId: "m2" });
    expect(t.rootMemberId).toBe("m1");
    expect(t.settings).toEqual({ showFemales: true });
    expect([t.marriages.length, t.sources.length, t.citations.length, t.media.length]).toEqual([1, 1, 1, 1]);
    expect(project.files[BLOB]).toEqual({ type: "image/png", data: Buffer.from([1, 2, 3]).toString("base64") });
    let i = 0;
    expect(snapshotError(withNewIds(t, () => `n${i++}`))).toBeNull();
  });

  it("a verified copy of the database folder can always be taken", async () => {
    const { dataDir } = await legacyDataDir();
    fs.rmSync(path.join(dataDir, "cluster", "PG_VERSION"));
    const r = recovery.copyDatabaseFolder(cluster.activeCluster(dataDir), tmp("usb"));
    same(cluster.fingerprint(path.join(r.dest, "cluster")), cluster.fingerprint(path.join(dataDir, "cluster")));
    expect(fs.readFileSync(path.join(r.dest, "password"), "utf8")).toBe("legacy-password-1051");
  });
});
