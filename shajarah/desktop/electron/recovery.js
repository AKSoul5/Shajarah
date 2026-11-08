// Ways back to the families when the database cannot start normally. None
// of them changes the original database folder: a repair works on a
// verified copy, an export only reads, and a copy only reads.

const fs = require("node:fs");
const net = require("node:net");
const path = require("node:path");
const { Client } = require("pg");
const cluster = require("./cluster");
const { Database } = require("./postgres");

function freePort() {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.unref();
    s.on("error", reject);
    s.listen(0, "127.0.0.1", () => {
      const { port } = s.address();
      s.close(() => resolve(port));
    });
  });
}

/** Runs `work(client)` against a database folder started on a free port, then stops it. */
async function withDatabase(dataDir, logDir, target, work) {
  const db = new Database(dataDir, logDir, target);
  await db.start(await freePort());
  const password = fs.readFileSync(target.passwordFile, "utf8").trim();
  const client = new Client({ host: "127.0.0.1", port: db.port, user: db.user, password, database: db.name });
  try {
    await client.connect();
    return await work(client);
  } finally {
    await client.end().catch(() => {});
    await db.stop();
  }
}

async function countFamilies(client) {
  const { rows } = await client.query(`SELECT to_regclass('public."FamilyTree"') IS NOT NULL AS ok`);
  if (!rows[0].ok) return { families: 0, people: 0 };
  const f = await client.query(`SELECT count(*)::int AS n FROM "FamilyTree"`);
  const m = await client.query(`SELECT count(*)::int AS n FROM "Member"`);
  return { families: f.rows[0].n, people: m.rows[0].n };
}

/**
 * Repairs a COPY of a database folder whose PG_VERSION or password file is
 * missing, starts the copy and counts its families. The original is only
 * read. Returns the copy, to be made the active database only once the
 * person has seen the counts and agreed (adoptRepair).
 */
async function repairOnCopy({ dataDir, logDir, source, state }) {
  if (!["marker-missing", "password-missing"].includes(state.kind)) throw new Error(`A ${state.kind} database folder cannot be repaired this way.`);
  if (state.kind === "marker-missing" && !state.repairable) throw new Error("This database was made by a different PostgreSQL version; it cannot be repaired here.");
  const id = cluster.newClusterId();
  const p = cluster.clusterPaths(dataDir, id);
  const staging = `${p.dir}.repair`;
  fs.mkdirSync(path.dirname(staging), { recursive: true });
  const copied = cluster.verifiedCopy(source.dir, staging);
  // (in the copy only) a server that was not shut down leaves its process id behind
  fs.rmSync(path.join(staging, "postmaster.pid"), { force: true }); // own-file: in the new copy only
  if (!fs.existsSync(path.join(staging, "PG_VERSION"))) fs.writeFileSync(path.join(staging, "PG_VERSION"), `${cluster.PG_MAJOR}\n`, { flag: "wx" });
  if (fs.existsSync(source.passwordFile)) {
    cluster.createPasswordFile(p.passwordFile, fs.readFileSync(source.passwordFile, "utf8").trim());
  } else {
    // A new password for the copy: let the copy accept a local login once, set it, and put its rules back.
    const hba = path.join(staging, "pg_hba.conf");
    const rules = fs.readFileSync(hba, "utf8");
    const password = cluster.createPasswordFile(p.passwordFile);
    fs.writeFileSync(hba, `host all all 127.0.0.1/32 trust\n${rules}`); // own-file: in the new copy only
    try {
      const db = new Database(dataDir, logDir, { dir: staging, passwordFile: p.passwordFile });
      db.port = await freePort();
      const { run, binDir, EXE } = require("./postgres");
      await run(path.join(binDir(), `pg_ctl${EXE}`), ["start", "-D", staging, "-l", db.serverLog, "-w", "-t", "60", "-o", `-p ${db.port}`], db.log);
      const c = new Client({ host: "127.0.0.1", port: db.port, user: db.user, database: "postgres" });
      try {
        await c.connect();
        await c.query(`ALTER ROLE "${db.user}" PASSWORD '${password.replace(/'/g, "''")}'`);
      } finally {
        await c.end().catch(() => {});
        await db.stop();
      }
    } finally {
      fs.writeFileSync(hba, rules); // own-file: in the new copy only
    }
  }
  const counts = await withDatabase(dataDir, logDir, { dir: staging, passwordFile: p.passwordFile }, countFamilies);
  return { id, staging, dir: p.dir, passwordFile: p.passwordFile, copied, counts };
}

/** Makes a repaired copy the active database (after the person agreed). The original stays where it is. */
function adoptRepair(dataDir, repair) {
  fs.renameSync(repair.staging, repair.dir); // own-file: our own repaired copy
  cluster.writePointer(dataDir, repair.dir, repair.passwordFile, "repaired copy chosen by the person");
}

const projectFileName = (name, id) => {
  const slug = String(name).normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-").toLowerCase();
  return `${slug ? `shajarah-${slug}` : "shajarah-family"}-${id.slice(-6)}.shajarah`;
};

/**
 * One project file per family, read straight from a database folder with no
 * app server (schema of 1.0.7–1.0.52). The files open with Open Project.
 */
async function exportFamilies({ dataDir, logDir, target, outDir }) {
  fs.mkdirSync(outDir, { recursive: true });
  return withDatabase(dataDir, logDir, target, async (c) => {
    const q = async (sql, args = []) => (await c.query(sql, args)).rows;
    const written = [];
    for (const t of await q(`SELECT * FROM "FamilyTree" ORDER BY "createdAt"`)) {
      const members = (await q(`SELECT * FROM "Member" WHERE "treeId" = $1 ORDER BY "generation", "birthOrder"`, [t.id])).map((m) => ({
        id: m.id, name: m.name, laqab: m.laqab, gender: m.gender, birthYear: m.birthYear, deathYear: m.deathYear,
        isDeceased: m.isDeceased, birthOrder: m.birthOrder, generation: m.generation, notes: m.notes, fatherId: m.fatherId, motherId: m.motherId,
      }));
      const marriages = (await q(`SELECT * FROM "Marriage" WHERE "treeId" = $1`, [t.id])).map((m) => ({
        id: m.id, spouseAId: m.spouseAId, spouseBId: m.spouseBId, startYear: m.startYear, endYear: m.endYear,
      }));
      const sources = (await q(`SELECT * FROM "Source" WHERE "treeId" = $1 ORDER BY "createdAt"`, [t.id])).map((s) => ({
        id: s.id, title: s.title, author: s.author, publication: s.publication, notes: s.notes,
      }));
      const citations = (await q(`SELECT c.* FROM "Citation" c JOIN "Member" m ON m.id = c."memberId" WHERE m."treeId" = $1 ORDER BY c."createdAt"`, [t.id])).map((x) => ({
        id: x.id, sourceId: x.sourceId, memberId: x.memberId, eventType: x.eventType, page: x.page,
      }));
      const media = (await q(`SELECT * FROM "Media" WHERE "treeId" = $1 ORDER BY "createdAt"`, [t.id])).map((x) => ({
        id: x.id, memberId: x.memberId, sourceId: x.sourceId, url: x.url, caption: x.caption, fileType: x.fileType,
      }));
      // uploaded photos and documents go inside the file, as Save Project does
      const files = {};
      const blobIds = [...new Set(media.map((x) => /^\/api\/media\/blob\/([0-9a-f]{64})$/.exec(x.url)?.[1]).filter(Boolean))];
      if (blobIds.length) {
        for (const b of await q(`SELECT id, data, "fileType" FROM "MediaBlob" WHERE id = ANY($1)`, [blobIds])) {
          files[b.id] = { type: b.fileType, data: Buffer.from(b.data).toString("base64") };
        }
      }
      const project = {
        format: "shajarah-project", version: 1, savedAt: new Date().toISOString(),
        tree: {
          name: t.name, title: t.title, subtitle: t.subtitle, lineage: t.lineage, rootMemberId: t.rootMemberId,
          crownBaseId: t.crownBaseId, trunkStartId: t.trunkStartId, soilText: t.soilText, settings: t.settings ?? null,
          members, marriages, sources, citations, media,
        },
        files,
      };
      const file = path.join(outDir, projectFileName(t.name, t.id));
      fs.writeFileSync(file, JSON.stringify(project), { flag: "wx" });
      written.push({ file, name: t.name, people: members.length });
    }
    return written;
  });
}

/** A verified copy of a database folder in a new folder under `destParent`. */
function copyDatabaseFolder(source, destParent) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const dest = path.join(destParent, `Shajarah database copy ${stamp}`);
  fs.mkdirSync(destParent, { recursive: true });
  const copied = cluster.verifiedCopy(source.dir, path.join(dest, "cluster"));
  if (fs.existsSync(source.passwordFile)) fs.copyFileSync(source.passwordFile, path.join(dest, "password"), fs.constants.COPYFILE_EXCL);
  return { dest, ...copied };
}

/** What is in the data folder (names and sizes, no family data), for a report. */
function describeDataFolder(dataDir) {
  const list = (d, depth) => {
    if (!fs.existsSync(d)) return null;
    return fs.readdirSync(d, { withFileTypes: true }).map((e) => {
      const full = path.join(d, e.name);
      if (e.isDirectory()) return { name: `${e.name}/`, entries: depth > 0 ? list(full, depth - 1) : undefined };
      return { name: e.name, size: fs.statSync(full).size };
    });
  };
  return list(dataDir, 2);
}

module.exports = { repairOnCopy, adoptRepair, exportFamilies, copyDatabaseFolder, describeDataFolder, countFamilies, withDatabase };
