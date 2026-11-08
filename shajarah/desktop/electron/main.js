// Shajarah as a desktop program: starts the app's own database and the app
// server in the background, and shows the app in a window. Closing the
// window stops both. Everything is kept in the user's profile
// (%APPDATA%\Shajarah on Windows): the database, and logs.
//
// `Shajarah --smoke-test` starts everything without a window, checks that
// the app answers and can save a family, prints the result and exits
// (0 = all good); the installer build runs it on a real Windows machine.
//
// Updates: each new version is published as a GitHub release. The program
// checks for it when it starts (and every few hours), downloads only what
// changed in the background, and offers to restart into it; otherwise it
// installs when Shajarah is closed. The families in the database are kept.
// `Shajarah --update-test` (used by the installer build) checks for the
// latest version, downloads it and installs it silently.

const { app, BrowserWindow, Menu, dialog, ipcMain, shell } = require("electron");
const { autoUpdater } = require("electron-updater");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const http = require("node:http");
const net = require("node:net");
const path = require("node:path");
const { Database } = require("./postgres");
const recovery = require("./recovery");
const cluster = require("./cluster");
const { migrate } = require("./migrate");
const { COMMANDS, EMPTY_STATE, cleanState, buildMenuTemplate } = require("./menu");

const SMOKE = process.argv.includes("--smoke-test");
const UPDATE_TEST = process.argv.includes("--update-test");
// `--recovery-test`: reports what state the database folder is in (JSON on
// stdout and in logs/recovery-test.txt) and exits, changing nothing.
const RECOVERY_TEST = process.argv.includes("--recovery-test");
// (tests run the installed program against a folder of their own)
if (process.env.SHAJARAH_USER_DATA) app.setPath("userData", path.resolve(process.env.SHAJARAH_USER_DATA));
const userData = app.getPath("userData");
const logDir = path.join(userData, "logs");
fs.mkdirSync(logDir, { recursive: true });
const mainLog = path.join(logDir, "shajarah.log");
const log = (msg) => fs.appendFileSync(mainLog, `${new Date().toISOString()} ${msg}\n`); // own-file: log

const resources = app.isPackaged ? process.resourcesPath : __dirname;
const serverDir = path.join(resources, "server");
const migrationsDir = path.join(resources, "migrations");
const iconPath = path.join(__dirname, "build", process.platform === "win32" ? "icon.ico" : "icon.png");

const db = new Database(path.join(userData, "database"), logDir);
let server = null;
let appUrl = null;

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

function get(url) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      res.resume();
      resolve(res.statusCode);
    });
    req.on("error", () => resolve(0));
    req.setTimeout(5000, () => req.destroy());
  });
}

async function waitFor(url, seconds) {
  const end = Date.now() + seconds * 1000;
  while (Date.now() < end) {
    const status = await get(url);
    if (status && status < 500) return true;
    if (server && server.exitCode !== null) return false;
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

async function startServer() {
  const port = await freePort();
  const out = fs.openSync(path.join(logDir, "server.log"), "a"); // own-file: log
  // Electron's own binary runs the Next.js server as plain Node.
  server = spawn(process.execPath, [path.join(serverDir, "server.js")], {
    cwd: serverDir,
    env: {
      ...process.env, ELECTRON_RUN_AS_NODE: "1", NODE_ENV: "production",
      PORT: String(port), HOSTNAME: "127.0.0.1", DATABASE_URL: db.url,
    },
    stdio: ["ignore", out, out],
    windowsHide: true,
  });
  appUrl = `http://127.0.0.1:${port}`;
  if (!(await waitFor(appUrl, 90))) throw new Error("The app server did not start.");
}

/** The database folder needs the person (see cluster.classify): nothing was changed. */
class NeedsRecovery extends Error {
  constructor(state) {
    super(`The family database needs attention (${state.kind}).`);
    this.state = state;
  }
}

let startupSeconds = null;
async function start() {
  const t0 = Date.now();
  const step = (what) => log(`${what} (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  log(`starting ${app.getVersion()}`);
  const state = await db.prepare();
  step(`database folder ${db.target.dir}: ${state.kind}`);
  if (state.kind !== "ready" && state.kind !== "created") throw new NeedsRecovery(state);
  await db.start(await freePort());
  step("database started");
  const applied = await migrate(db.url, migrationsDir);
  step(applied.length ? `migrations applied: ${applied.join(", ")}` : "database up to date");
  await startServer();
  startupSeconds = (Date.now() - t0) / 1000;
  step(`ready at ${appUrl}`);
}

let stopping = null;
let stopped = false;
function stop() {
  stopping ??= (async () => {
    if (server && server.exitCode === null) {
      // (waited for: an update can only replace the program's files once
      // the server, which runs as Shajarah.exe too, has ended)
      const ended = new Promise((resolve) => {
        server.once("exit", resolve);
        setTimeout(resolve, 10000);
      });
      if (process.platform === "win32") spawn("taskkill", ["/pid", String(server.pid), "/t", "/f"], { windowsHide: true });
      else server.kill();
      await ended;
    }
    await db.stop();
    stopped = true;
    log("stopped");
  })();
  return stopping;
}

function splashWindow() {
  const w = new BrowserWindow({
    width: 360, height: 140, frame: false, resizable: false, show: false, icon: iconPath,
    backgroundColor: "#f6efe0",
  });
  w.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(`<!doctype html><meta charset="utf-8">
    <body style="margin:0;height:100vh;display:flex;align-items:center;justify-content:center;
      font:600 18px 'Segoe UI',sans-serif;color:#5b3a1d;background:#f6efe0">Starting Shajarah…</body>`));
  w.once("ready-to-show", () => w.show());
  return w;
}

// ── The menu bar ─────────────────────────────────────────────────────
// File, Edit, View and Help, shown (not hidden behind Alt). Items that act
// on a family are commands the page carries out with its own actions; the
// page reports what is possible and the menu is built again from that (see
// menu.js). Files opened from the menu are chosen in the program's own
// dialog, read here and handed to the page's usual open or import.
const COMMAND = "shajarah:command";
const STATE = "shajarah:state";
// (the project's own home, where its updates are published)
const repo = (() => {
  const publish = require("./package.json").build?.publish;
  return publish?.provider === "github" && publish.owner && publish.repo ? `https://github.com/${publish.owner}/${publish.repo}` : null;
})();
const LINKS = repo ? { documentation: `${repo}#readme`, releases: `${repo}/releases` } : {};
/** A file the menu opens: how large it may be, and what it may be called. */
const OPENS = {
  project: { title: "Open Project", filters: [{ name: "Shajarah project", extensions: ["shajarah", "json"] }], maxBytes: 512 * 1024 * 1024 },
  gedcom: { title: "Import a GEDCOM File", filters: [{ name: "GEDCOM", extensions: ["ged", "gedcom"] }], maxBytes: 20 * 1024 * 1024 },
  outline: { title: "Import a Family Outline", filters: [{ name: "Family outline", extensions: ["txt"] }], maxBytes: 20 * 1024 * 1024 },
};
let menuState = EMPTY_STATE;
let editorWindow = null;

/** The window commands go to (none: the command is dropped). */
function commandTarget() {
  const w = BrowserWindow.getFocusedWindow() ?? editorWindow;
  return w && !w.isDestroyed() && !w.webContents.isDestroyed() ? w : null;
}

function sendCommand(command) {
  if (!COMMANDS.includes(command.type)) return;
  const w = commandTarget();
  if (!w) return log(`menu: ${command.type} with no window`);
  w.webContents.send(COMMAND, command);
}

async function openFromMenu(kind) {
  const spec = OPENS[kind];
  const w = commandTarget();
  if (!spec || !w) return;
  const { canceled, filePaths } = await dialog.showOpenDialog(w, { title: spec.title, filters: spec.filters, properties: ["openFile"] });
  if (canceled || !filePaths[0]) return;
  const file = filePaths[0];
  try {
    const { size } = await fs.promises.stat(file);
    if (size > spec.maxBytes) throw new Error(`The file is ${Math.round(size / 1024 / 1024)} MB; the most this can open is ${spec.maxBytes / 1024 / 1024} MB.`);
    const data = new Uint8Array(await fs.promises.readFile(file));
    sendCommand({ type: kind === "project" ? "open-project" : `import-${kind}`, file: { name: path.basename(file), data } });
  } catch (err) {
    dialog.showMessageBox(w, { type: "error", title: spec.title, message: `Could not open ${path.basename(file)}`, detail: err.message });
  }
}

function showAbout() {
  const w = commandTarget();
  const options = {
    type: "info", title: "About Shajarah", buttons: ["OK"],
    message: `Shajarah ${app.getVersion()}`,
    detail: [
      "Family tree posters.",
      "",
      `Version ${app.getVersion()} (desktop)`,
      `Electron ${process.versions.electron} · Chromium ${process.versions.chrome} · Node ${process.versions.node}`,
      ...(repo ? ["", repo] : []),
    ].join("\n"),
  };
  return w ? dialog.showMessageBox(w, options) : dialog.showMessageBox(options);
}

function buildMenu() {
  const template = buildMenuTemplate(menuState, {
    send: (type) => sendCommand({ type }),
    act: {
      openProject: () => openFromMenu("project"),
      importFile: (kind) => openFromMenu(kind),
      about: () => showAbout(),
      openLink: (name) => LINKS[name] && shell.openExternal(LINKS[name]),
    },
    appName: "Shajarah", isMac: process.platform === "darwin", links: LINKS,
  });
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function installMenu() {
  buildMenu();
  // (only from the program's own window; the report is checked field by field)
  ipcMain.on(STATE, (event, raw) => {
    if (!editorWindow || editorWindow.isDestroyed() || event.sender !== editorWindow.webContents) return;
    const next = cleanState(raw);
    if (JSON.stringify(next) === JSON.stringify(menuState)) return;
    menuState = next;
    buildMenu();
  });
}

function mainWindow() {
  const w = new BrowserWindow({
    width: 1400, height: 900, show: false, icon: iconPath, title: "Shajarah",
    autoHideMenuBar: false, backgroundColor: "#f6efe0",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true, nodeIntegration: false, sandbox: true,
    },
  });
  editorWindow = w;
  // a page loaded afresh reports again; until then nothing is on offer
  w.webContents.on("did-start-navigation", ({ isMainFrame, isSameDocument }) => {
    if (!isMainFrame || isSameDocument) return;
    menuState = EMPTY_STATE;
    buildMenu();
  });
  w.on("closed", () => {
    if (editorWindow === w) editorWindow = null;
    menuState = EMPTY_STATE;
    buildMenu();
  });
  // Photos and documents open in a window of their own; other links in the browser.
  w.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith(appUrl) || url.startsWith("data:")) return { action: "allow" };
    shell.openExternal(url);
    return { action: "deny" };
  });
  w.loadURL(appUrl);
  w.once("ready-to-show", () => w.show());
  return w;
}

async function smokeTest() {
  const results = { startupSeconds, version: app.getVersion() };
  // (reported, not required: there may be no release yet, or no connection)
  autoUpdater.autoDownload = false;
  results.latestRelease = await autoUpdater.checkForUpdates()
    .then((r) => r?.updateInfo.version ?? null, (err) => `unavailable: ${err.message.split("\n")[0]}`);
  results.home = await get(appUrl);
  results.demo = await get(`${appUrl}/demo?sample=nouri`);
  const created = await fetch(`${appUrl}/api/trees`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Smoke test family" }),
  });
  results.createTree = created.status;
  const tree = await created.json().catch(() => ({}));
  results.readTree = tree.id ? (await fetch(`${appUrl}/api/trees/${tree.id}`)).status : 0;
  if (tree.id) results.deleteTree = (await fetch(`${appUrl}/api/trees/${tree.id}`, { method: "DELETE" })).status;
  results.ui = await uiSmoke().catch((err) => ({ ok: false, errors: [`smoke test failed: ${err.message}`] }));
  const ok = results.home === 200 && results.demo === 200 && results.createTree === 201 && results.readTree === 200 && results.ui.ok;
  return { ok, results };
}

/**
 * The editor itself, as a person uses it: a sample family opened in a
 * (hidden) window, the poster drawn, then every menu in its header opened
 * and closed (the Style menu draws every design and foundation style), and
 * a name chosen. Any error on the page, a crashed page, or the page's
 * "Application error" fails the smoke test, so a build that breaks on a
 * click is never published.
 */
async function uiSmoke() {
  const errors = [];
  const win = new BrowserWindow({ show: false, width: 1400, height: 900, webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true } });
  const wc = win.webContents;
  // (Electron passes the level as a number before version 35, as a word since)
  wc.on("console-message", (...args) => {
    const e = args[0];
    const level = typeof args[1] === "number" ? args[1] : e?.level;
    const message = typeof args[2] === "string" ? args[2] : e?.message ?? "";
    if ((level === 3 || level === "error") && !/favicon|DevTools/i.test(message)) errors.push(message.slice(0, 300));
  });
  wc.on("render-process-gone", (_e, d) => errors.push(`page crashed: ${d.reason}`));
  const run = (js) => wc.executeJavaScript(js, true);
  const pause = (ms) => new Promise((r) => setTimeout(r, ms));
  try {
    await win.loadURL(`${appUrl}/demo?sample=nouri`);
    const drawn = await run(`new Promise((done) => {
      const t0 = Date.now();
      const look = () => document.querySelector("main svg[role=img]") ? done(true) : Date.now() - t0 > 180000 ? done(false) : setTimeout(look, 500);
      look();
    })`);
    if (!drawn) errors.push("the poster was not drawn within 3 minutes");
    const broken = () => run(`/Application error/.test(document.body.innerText)`);
    // every menu in the header (buttons that open a panel), opened and closed
    const menus = await run(`[...document.querySelectorAll("header button[aria-expanded]")].map((b) => b.innerText.trim()).filter(Boolean)`);
    const opened = [];
    for (let i = 0; i < menus.length; i++) {
      await run(`document.querySelectorAll("header button[aria-expanded]")[${i}]?.click()`);
      await pause(2500);
      opened.push(menus[i]);
      if (await broken()) { errors.push(`the page broke on opening "${menus[i]}"`); break; }
      await run(`(document.activeElement ?? document.body).dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); document.body.click()`);
      await pause(500);
    }
    // a name chosen on the poster opens the person's panel
    if (!errors.length) {
      await run(`document.querySelector("main [data-member]")?.dispatchEvent(new MouseEvent("click", { bubbles: true }))`);
      await pause(1500);
      if (await broken()) errors.push("the page broke on choosing a name");
    }
    return { ok: drawn && errors.length === 0 && opened.length > 0, menus: opened, errors: errors.slice(0, 5) };
  } finally {
    win.destroy();
  }
}

// ── Recovery ─────────────────────────────────────────────────────────
// When the database cannot be used as it is, this window explains why and
// offers ways back to the families. It needs neither the app server nor a
// running database, and nothing it does changes the original folder.
function reportRecoveryState(state) {
  const line = `RECOVERY ${JSON.stringify({ ...state, folder: db.target?.dir ?? null })}`;
  console.log(line);
  log(line);
  fs.writeFileSync(path.join(logDir, "recovery-test.txt"), line + "\n"); // own-file: log
  app.exit(state.kind === "ready" ? 0 : 3);
}

function recoveryWindow(initial) {
  const state = initial;
  let repair = null;
  const dataDir = path.join(userData, "database");
  const w = new BrowserWindow({
    width: 720, height: 640, show: false, icon: iconPath, backgroundColor: "#f6efe0", title: "Shajarah — recovery",
    webPreferences: { preload: path.join(__dirname, "recovery-preload.js"), contextIsolation: true, sandbox: true },
  });
  const ask = async (title, buttons) => (await dialog.showMessageBox(w, { type: "question", title, message: title, buttons, cancelId: buttons.length - 1 })).response;
  const chooseFolder = async (title) => {
    const r = await dialog.showOpenDialog(w, { title, properties: ["openDirectory", "createDirectory"] });
    return r.canceled ? null : r.filePaths[0];
  };
  const handlers = {
    state: () => ({ ...state, folder: db.target?.dir ?? null, dataDir, logDir, version: app.getVersion(), repair: repair && { counts: repair.counts } }),
    openFolder: () => shell.openPath(dataDir),
    openLogs: () => shell.openPath(logDir),
    report: async () => {
      const r = await dialog.showSaveDialog(w, { title: "Save a diagnostic report", defaultPath: path.join(app.getPath("documents"), "shajarah-diagnostic.json") });
      if (r.canceled) return null;
      const tail = (f) => (fs.existsSync(f) ? fs.readFileSync(f, "utf8").split("\n").slice(-200).join("\n") : null);
      const report = { version: app.getVersion(), at: new Date().toISOString(), state, folder: db.target?.dir ?? null,
        dataFolder: recovery.describeDataFolder(dataDir), log: tail(mainLog), postgresLog: tail(path.join(logDir, "postgres.log")),
        postgresTools: tail(path.join(logDir, "postgres-tools.log")) };
      fs.writeFileSync(r.filePath, JSON.stringify(report, null, 2)); // own-file: chosen by the person
      return r.filePath;
    },
    copyFolder: async () => {
      if (!db.target?.dir) throw new Error("No database folder is known.");
      const to = await chooseFolder("Copy the database folder to…");
      return to ? recovery.copyDatabaseFolder(db.target, to) : null;
    },
    exportFamilies: async () => {
      const target = repair ? { dir: repair.staging, passwordFile: repair.passwordFile } : db.target;
      const to = await chooseFolder("Save the families as project files in…");
      return to ? recovery.exportFamilies({ dataDir, logDir, target, outDir: to }) : null;
    },
    repair: async () => {
      repair = await recovery.repairOnCopy({ dataDir, logDir, source: db.target, state });
      return { counts: repair.counts, copied: repair.copied };
    },
    adoptRepair: async () => {
      if (!repair) throw new Error("There is no repaired copy.");
      const { families, people } = repair.counts;
      const yes = await ask(`Use the repaired copy (${families} families, ${people} people)? The original folder stays where it is.`, ["Use the repaired copy", "Cancel"]);
      if (yes !== 0) return false;
      recovery.adoptRepair(dataDir, repair);
      app.relaunch();
      app.exit(0);
      return true;
    },
    newDatabase: async () => {
      if (state.kind !== "incomplete") throw new Error("A new database is only offered when the folder was never set up.");
      const yes = await ask("Start a new, empty database in a new folder? The current folder stays where it is.", ["Start a new database", "Cancel"]);
      if (yes !== 0) return false;
      const fresh = new Database(dataDir, logDir);
      await fresh.createNew("person chose a new database: the previous folder was never set up");
      app.relaunch();
      app.exit(0);
      return true;
    },
    quit: () => app.exit(1),
  };
  ipcMain.removeHandler("shajarah:recovery");
  ipcMain.handle("shajarah:recovery", async (_e, name) => {
    if (!Object.hasOwn(handlers, name)) throw new Error(`unknown action ${name}`);
    try {
      return { ok: true, value: await handlers[name]() };
    } catch (err) {
      log(`recovery ${name} failed: ${err.stack || err}`);
      return { ok: false, error: err.message };
    }
  });
  w.loadFile(path.join(__dirname, "recovery.html"));
  w.once("ready-to-show", () => w.show());
  w.on("closed", () => app.exit(1));
}

// ── Updates ──────────────────────────────────────────────────────────
autoUpdater.logger = {
  info: (m) => log(`update: ${m}`), warn: (m) => log(`update: ${m}`),
  error: (m) => log(`update error: ${m}`), debug: () => {},
};

/** Stops the server and the database, then restarts into the new version. */
async function restartIntoUpdate() {
  await stop();
  autoUpdater.quitAndInstall(true, true);
}

function watchForUpdates(window) {
  if (!app.isPackaged) return;
  let offered = false;
  autoUpdater.on("update-downloaded", async ({ version }) => {
    if (offered) return;
    offered = true;
    const { response } = await dialog.showMessageBox(window, {
      type: "info", buttons: ["Restart now", "Later"], defaultId: 0, cancelId: 1,
      title: "Update ready",
      message: `Shajarah ${version} is ready to install.`,
      detail: "Restart now to update, or it will be installed when you close Shajarah. Your families are kept.",
    });
    if (response === 0) restartIntoUpdate();
  });
  // no connection, or no release yet: try again later, quietly
  const check = () => autoUpdater.checkForUpdates().catch((err) => log(`update check failed: ${err.message}`));
  check();
  setInterval(check, 6 * 60 * 60 * 1000);
}

/** --update-test: finds, downloads and silently installs the latest version. */
async function updateTest() {
  const report = (line) => {
    console.log(line);
    log(line);
    fs.writeFileSync(path.join(logDir, "update-test.txt"), line + "\n"); // own-file: log
  };
  autoUpdater.autoInstallOnAppQuit = false;
  try {
    const found = await autoUpdater.checkForUpdates();
    if (!found?.isUpdateAvailable) {
      report(`UPDATE NONE current ${app.getVersion()} latest ${found?.updateInfo.version}`);
      app.exit(2);
      return;
    }
    await found.downloadPromise;
    report(`UPDATE DOWNLOADED ${app.getVersion()} -> ${found.updateInfo.version}`);
    autoUpdater.quitAndInstall(true, false);
  } catch (err) {
    report(`UPDATE FAIL ${err.message}`);
    app.exit(1);
  }
}

if (UPDATE_TEST) {
  app.whenReady().then(updateTest);
} else if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    const w = BrowserWindow.getAllWindows()[0];
    if (w) {
      if (w.isMinimized()) w.restore();
      w.focus();
    }
  });

  app.whenReady().then(async () => {
    if (RECOVERY_TEST) {
      // only reads the folder: no database is started or created
      db.target = cluster.activeCluster(path.join(userData, "database"));
      return reportRecoveryState(cluster.classify(db.target));
    }
    const splash = SMOKE ? null : splashWindow();
    try {
      await start();
    } catch (err) {
      log(`failed: ${err.stack || err}`);
      splash?.destroy();
      await stop();
      const state = err instanceof NeedsRecovery ? err.state : { kind: "start-failed", detail: err.message };
      if (SMOKE) {
        console.error(`SMOKE FAIL ${err.message}`);
        app.exit(1);
        return;
      }
      recoveryWindow(state);
      return;
    }
    if (SMOKE) {
      const { ok, results } = await smokeTest().catch((err) => ({ ok: false, results: { error: String(err) } }));
      const line = `SMOKE ${ok ? "PASS" : "FAIL"} ${JSON.stringify(results)}`;
      console.log(line);
      log(line);
      fs.writeFileSync(path.join(logDir, "smoke-test.txt"), line + "\n"); // own-file: log
      await stop();
      app.exit(ok ? 0 : 1);
      return;
    }
    installMenu();
    const window = mainWindow();
    splash.destroy();
    watchForUpdates(window);
  });

  app.on("window-all-closed", () => app.quit());
  // Stop the server and the database before the program ends. (Then quit
  // again, normally: a downloaded update installs as the program quits.)
  app.on("will-quit", (event) => {
    if (stopped) return;
    event.preventDefault();
    stop().finally(() => app.quit());
  });
}
