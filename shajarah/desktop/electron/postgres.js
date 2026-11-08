// The app's own PostgreSQL: binaries from @embedded-postgres/<platform>, a
// data folder in the user's profile, started and stopped with pg_ctl (which
// also drops administrator rights on Windows, as PostgreSQL requires).

const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const { Client } = require("pg");
const cluster = require("./cluster");

const EXE = process.platform === "win32" ? ".exe" : "";
const PLATFORM = { win32: "windows", linux: "linux", darwin: "darwin" }[process.platform];

function binDir() {
  return path.join(__dirname, "node_modules", "@embedded-postgres", `${PLATFORM}-${process.arch}`, "native", "bin");
}

// Runs a PostgreSQL tool with its output going straight to the log file, and
// waits for the tool itself to exit. (`pg_ctl start` leaves the server
// running with its output handles: waiting for pipes to close, as execFile
// does, would last until a timeout on Windows.)
function run(file, args, log) {
  return new Promise((resolve, reject) => {
    fs.appendFileSync(log, `$ ${path.basename(file)} ${args.join(" ")}\n`); // own-file: log
    const out = fs.openSync(log, "a"); // own-file: log
    const child = spawn(file, args, { windowsHide: true, stdio: ["ignore", out, out] });
    const timer = setTimeout(() => child.kill(), 120000);
    let settled = false;
    const done = (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fs.closeSync(out);
      if (err) reject(err);
      else resolve();
    };
    child.once("error", (err) => done(new Error(`${path.basename(file)} could not run: ${err.message}`)));
    child.once("exit", (code, signal) => done(code === 0 ? null
      : new Error(`${path.basename(file)} failed (${signal ?? `exit ${code}`}); see ${log}`)));
  });
}

class Database {
  /** dataDir holds the database folders (see cluster.js); logDir the PostgreSQL logs. */
  constructor(dataDir, logDir, target = null) {
    this.dataDir = dataDir;
    this.log = path.join(logDir, "postgres-tools.log");
    this.serverLog = path.join(logDir, "postgres.log");
    this.bin = binDir();
    this.user = "shajarah";
    this.name = "shajarah";
    this.target = target; // { dir, passwordFile }: a fixed folder (a repaired copy); else the active one
  }

  /**
   * Finds the database folder and says what state it is in, changing
   * nothing that exists. Only when there is no database at all is a new one
   * created, in a new folder of its own. Returns the state (see
   * cluster.classify); anything but "ready" or "created" needs the person.
   */
  async prepare() {
    this.target ??= cluster.activeCluster(this.dataDir);
    const state = cluster.classify(this.target);
    if (state.kind === "none" || state.kind === "empty") {
      this.target = await this.createNew(state.kind === "empty" ? "the old database folder was empty" : "first start");
      return { kind: "created", previous: state.kind };
    }
    return state;
  }

  /** A new database in a new folder, then (only once it is complete) made the active one. */
  async createNew(reason) {
    const id = cluster.newClusterId();
    const p = cluster.clusterPaths(this.dataDir, id);
    fs.mkdirSync(path.dirname(p.dir), { recursive: true });
    cluster.createPasswordFile(p.passwordFile);
    await run(path.join(this.bin, `initdb${EXE}`), [
      "-D", p.staging, "-U", this.user, `--pwfile=${p.passwordFile}`,
      "-A", "scram-sha-256", "-E", "UTF8", "--locale=C",
    ], this.log);
    // local connections only, and no Unix socket folder to need
    fs.appendFileSync(path.join(p.staging, "postgresql.conf"), // own-file: the new folder being set up
      "\nlisten_addresses = '127.0.0.1'\nunix_socket_directories = ''\n");
    fs.writeFileSync(path.join(p.staging, "shajarah-cluster.json"), // own-file: the new folder being set up (wx)
      JSON.stringify({ createdAt: new Date().toISOString(), postgres: cluster.PG_MAJOR, reason }, null, 2), { flag: "wx" });
    fs.renameSync(p.staging, p.dir); // own-file: our own new folder, complete now
    cluster.writePointer(this.dataDir, p.dir, p.passwordFile, reason);
    return { dir: p.dir, passwordFile: p.passwordFile };
  }

  async start(port) {
    this.port = port;
    await run(path.join(this.bin, `pg_ctl${EXE}`), [
      "start", "-D", this.target.dir, "-l", this.serverLog, "-w", "-t", "60", "-o", `-p ${port}`,
    ], this.log);
    const password = fs.readFileSync(this.target.passwordFile, "utf8").trim();
    this.url = `postgresql://${this.user}:${encodeURIComponent(password)}@127.0.0.1:${port}/${this.name}?schema=public`;
    const admin = new Client({ host: "127.0.0.1", port, user: this.user, password, database: "postgres" });
    await admin.connect();
    try {
      const { rowCount } = await admin.query("SELECT 1 FROM pg_database WHERE datname = $1", [this.name]);
      if (!rowCount) await admin.query(`CREATE DATABASE "${this.name}"`);
    } finally {
      await admin.end();
    }
  }

  async stop() {
    if (!this.port) return;
    this.port = undefined;
    await run(path.join(this.bin, `pg_ctl${EXE}`), ["stop", "-D", this.target.dir, "-m", "fast", "-w", "-t", "30"], this.log)
      .catch(() => {});
  }
}

module.exports = { Database, run, binDir, EXE };
