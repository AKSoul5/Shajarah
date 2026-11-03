// The desktop program's menu bar: File, Edit, View, Help. Every item that
// acts on a family is a command sent to the page (see preload.js and
// src/lib/desktop.ts), which runs the app's own action for it: the same
// undo history, project files, imports and exports as its buttons. Nothing
// here keeps a copy of the page's state; the page reports what is possible
// (an editor open, something to undo, the member list shown) and the menu is
// built again from that.
//
// buildMenuTemplate is a plain function (no Electron), so it can be tested.

/** Every command the menu sends to the page; the page ignores any other. */
const COMMANDS = [
  "new-family", "open-project", "save-project", "save-project-as", "import-gedcom", "import-outline",
  "export-svg", "export-pdf", "export-png", "export-tiled-pdf",
  "undo", "redo", "toggle-sidebar", "zoom-in", "zoom-out", "zoom-reset",
];

/** What the page last reported (nothing yet: no family open). */
const EMPTY_STATE = Object.freeze({ page: "none", canUndo: false, canRedo: false, undoLabel: null, redoLabel: null, sidebar: true });

/** The page's report, kept to known fields and types. */
function cleanState(raw) {
  const s = raw && typeof raw === "object" ? raw : {};
  const label = (v) => (typeof v === "string" && v.length <= 80 ? v : null);
  return {
    page: s.page === "editor" || s.page === "home" ? s.page : "none",
    canUndo: s.canUndo === true,
    canRedo: s.canRedo === true,
    undoLabel: label(s.undoLabel),
    redoLabel: label(s.redoLabel),
    sidebar: s.sidebar !== false,
  };
}

/**
 * The menu as Electron's template. `send(command)` passes a command to the
 * page; `act` holds the program's own actions (open a file, about, links).
 */
function buildMenuTemplate(state, { send, act, appName = "Shajarah", isMac = false, links = {} }) {
  const editor = state.page === "editor";
  const page = state.page !== "none";
  const cmd = (command) => () => send(command);
  const file = {
    label: "&File",
    submenu: [
      { id: "new-family", label: "&New Family…", accelerator: "CmdOrCtrl+N", enabled: page, click: cmd("new-family") },
      { id: "open-project", label: "&Open Project…", accelerator: "CmdOrCtrl+O", enabled: page, click: () => act.openProject() },
      { type: "separator" },
      // (a copy of the family in one file; every edit is saved as it is made)
      { id: "save-project", label: "&Save Project File…", accelerator: "CmdOrCtrl+S", enabled: editor, click: cmd("save-project") },
      { id: "save-project-as", label: "Save Project File &As…", accelerator: "CmdOrCtrl+Shift+S", enabled: editor, click: cmd("save-project-as") },
      { type: "separator" },
      {
        label: "&Import", enabled: page,
        submenu: [
          { id: "import-gedcom", label: "&GEDCOM File…", enabled: page, click: () => act.importFile("gedcom") },
          { id: "import-outline", label: "Family &Outline…", enabled: page, click: () => act.importFile("outline") },
        ],
      },
      {
        label: "&Export Poster", enabled: editor,
        submenu: [
          { id: "export-svg", label: "&SVG (vector)", enabled: editor, click: cmd("export-svg") },
          { id: "export-pdf", label: "Print &PDF", enabled: editor, click: cmd("export-pdf") },
          { id: "export-png", label: "P&NG Image", enabled: editor, click: cmd("export-png") },
          { id: "export-tiled-pdf", label: "&Tiled PDF", enabled: editor, click: cmd("export-tiled-pdf") },
        ],
      },
      { type: "separator" },
      isMac ? { role: "close" } : { role: "quit", label: "E&xit" },
    ],
  };
  const edit = {
    label: "&Edit",
    submenu: [
      // The page handles these keys itself: in a text field they edit the
      // text, elsewhere they step through the family's history. So the menu
      // shows them without taking them (registerAccelerator: false), and a
      // click asks the page to do the same.
      {
        id: "undo", label: state.undoLabel ? `&Undo ${state.undoLabel}` : "&Undo", accelerator: "CmdOrCtrl+Z", registerAccelerator: false,
        enabled: page, click: cmd("undo"),
      },
      {
        id: "redo", label: state.redoLabel ? `&Redo ${state.redoLabel}` : "&Redo", accelerator: isMac ? "Cmd+Shift+Z" : "Ctrl+Y", registerAccelerator: false,
        enabled: page, click: cmd("redo"),
      },
      { type: "separator" },
      { role: "cut", label: "Cu&t" },
      { role: "copy", label: "&Copy" },
      { role: "paste", label: "&Paste" },
      { type: "separator" },
      { role: "selectAll", label: "Select &All" },
    ],
  };
  const view = {
    label: "&View",
    submenu: [
      // (the same setting as the page's View menu and its [ key)
      { id: "toggle-sidebar", label: "&Member List", type: "checkbox", checked: editor && state.sidebar, enabled: editor, accelerator: "[", registerAccelerator: false, click: cmd("toggle-sidebar") },
      { type: "separator" },
      // (the poster's own zoom, as its + − Fit buttons; the keys are the
      // page's, which leaves them to text fields as it does undo)
      { id: "zoom-in", label: "Zoom &In", accelerator: "CmdOrCtrl+=", registerAccelerator: false, enabled: editor, click: cmd("zoom-in") },
      { id: "zoom-out", label: "Zoom &Out", accelerator: "CmdOrCtrl+-", registerAccelerator: false, enabled: editor, click: cmd("zoom-out") },
      { id: "zoom-reset", label: "&Fit Poster to Window", accelerator: "CmdOrCtrl+0", registerAccelerator: false, enabled: editor, click: cmd("zoom-reset") },
      { type: "separator" },
      { role: "togglefullscreen", label: "F&ull Screen" },
    ],
  };
  const help = {
    label: "&Help",
    submenu: [
      ...(links.documentation ? [{ id: "documentation", label: "&Documentation", click: () => act.openLink("documentation") }] : []),
      ...(links.releases ? [{ id: "releases", label: "&Release Notes", click: () => act.openLink("releases") }] : []),
      ...(links.documentation || links.releases ? [{ type: "separator" }] : []),
      { id: "about", label: `&About ${appName}`, click: () => act.about() },
    ],
  };
  return [file, edit, view, help];
}

module.exports = { COMMANDS, EMPTY_STATE, cleanState, buildMenuTemplate };
