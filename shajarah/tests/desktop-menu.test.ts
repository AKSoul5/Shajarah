// The desktop program's menu bar (desktop/electron/menu.js) and the page's
// side of it (src/lib/desktop.ts): the menu's items and when they can be
// used, the commands they send and the program actions they call, and the
// page receiving them (in the desktop program, and in a browser, where
// there is no menu at all).
import { createRequire } from "node:module";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DESKTOP_COMMANDS, editingText, listenForCommands, parseCommand, reportDesktopState, inDesktop } from "@/lib/desktop";

const require = createRequire(import.meta.url);
const { COMMANDS, EMPTY_STATE, cleanState, buildMenuTemplate } = require("../desktop/electron/menu.js") as {
  COMMANDS: string[];
  EMPTY_STATE: Record<string, unknown>;
  cleanState: (raw: unknown) => Record<string, unknown>;
  buildMenuTemplate: (state: unknown, opts: unknown) => MenuItem[];
};

interface MenuItem {
  id?: string; label?: string; role?: string; type?: string; enabled?: boolean; checked?: boolean;
  accelerator?: string; registerAccelerator?: boolean; click?: () => void; submenu?: MenuItem[];
}

function menu(state: Record<string, unknown>, links = {}) {
  const send = vi.fn();
  const act = { openProject: vi.fn(), importFile: vi.fn(), about: vi.fn(), openLink: vi.fn() };
  const template = buildMenuTemplate(cleanState(state), { send, act, links });
  const all: MenuItem[] = [];
  const walk = (items: MenuItem[]) => items.forEach((i) => { all.push(i); if (i.submenu) walk(i.submenu); });
  walk(template);
  const item = (id: string) => {
    const found = all.find((i) => i.id === id || i.role === id);
    if (!found) throw new Error(`no menu item ${id}`);
    return found;
  };
  return { template, all, item, send, act };
}

describe("the desktop menu bar", () => {
  it("has File, Edit, View and Help, in that order, with keyboard mnemonics", () => {
    const { template } = menu({ page: "editor" });
    expect(template.map((m) => m.label)).toEqual(["&File", "&Edit", "&View", "&Help"]);
  });

  it("File: new, open, save, save as, import, export, exit", () => {
    const { template } = menu({ page: "editor" });
    const labels = template[0].submenu!.map((i) => i.label ?? i.role ?? i.type);
    expect(labels).toEqual(["&New Family…", "&Open Project…", "separator", "&Save Project File…", "Save Project File &As…", "separator", "&Import", "&Export Poster", "separator", "E&xit"]);
    expect(template[0].submenu!.at(-1)!.role).toBe("quit");
  });

  it("every command a menu item sends is one the page knows, and the page knows exactly the menu's commands", () => {
    expect([...COMMANDS].sort()).toEqual([...DESKTOP_COMMANDS].sort());
    const { all, send } = menu({ page: "editor", canUndo: true, canRedo: true });
    for (const i of all) if (i.click) i.click();
    for (const [type] of send.mock.calls) expect(COMMANDS).toContain(type);
    // (opening and importing are the program's own dialogs, then a command with the file)
    expect(send.mock.calls.map(([t]) => t).sort()).toEqual([
      "export-pdf", "export-png", "export-svg", "export-tiled-pdf", "new-family", "redo", "save-project", "save-project-as",
      "toggle-sidebar", "undo", "zoom-in", "zoom-out", "zoom-reset",
    ]);
  });

  it("Open and Import use the program's file dialogs; About the program's own box", () => {
    const { item, act, send } = menu({ page: "home" });
    item("open-project").click!();
    item("import-gedcom").click!();
    item("import-outline").click!();
    item("about").click!();
    expect(act.openProject).toHaveBeenCalledOnce();
    expect(act.importFile.mock.calls).toEqual([["gedcom"], ["outline"]]);
    expect(act.about).toHaveBeenCalledOnce();
    expect(send).not.toHaveBeenCalled();
  });

  it("with no window or page: only what needs none (quit, text editing, full screen, about)", () => {
    const { all } = menu(EMPTY_STATE);
    const usable = all.filter((i) => i.click && i.enabled !== false).map((i) => i.id);
    expect(usable).toEqual(["about"]);
    for (const role of ["quit", "cut", "copy", "paste", "selectAll", "togglefullscreen"]) expect(all.some((i) => i.role === role)).toBe(true);
  });

  it("on the start page: new, open and import, not what needs a family", () => {
    const { item } = menu({ page: "home" });
    for (const id of ["new-family", "open-project", "import-gedcom", "import-outline", "undo", "redo"]) expect(item(id).enabled, id).toBe(true);
    for (const id of ["save-project", "save-project-as", "export-svg", "export-pdf", "export-png", "export-tiled-pdf", "toggle-sidebar", "zoom-in", "zoom-out", "zoom-reset"]) {
      expect(item(id).enabled, id).toBe(false);
    }
  });

  it("in the editor: every item, and the member list ticked as the page has it", () => {
    expect(menu({ page: "editor", sidebar: true }).item("toggle-sidebar").checked).toBe(true);
    expect(menu({ page: "editor", sidebar: false }).item("toggle-sidebar").checked).toBe(false);
    const { all } = menu({ page: "editor" });
    expect(all.filter((i) => i.click && i.enabled === false)).toEqual([]);
  });

  it("Undo and Redo: the page's own keys (shown, not taken), named after the step they undo", () => {
    const { item } = menu({ page: "editor", canUndo: true, canRedo: true, undoLabel: "Add Salim", redoLabel: "Move Hind" });
    expect(item("undo")).toMatchObject({ label: "&Undo Add Salim", accelerator: "CmdOrCtrl+Z", registerAccelerator: false });
    expect(item("redo")).toMatchObject({ label: "&Redo Move Hind", accelerator: "Ctrl+Y", registerAccelerator: false });
    // (the member list's [ and the zoom keys likewise)
    for (const id of ["toggle-sidebar", "zoom-in", "zoom-out", "zoom-reset"]) expect(item(id).registerAccelerator, id).toBe(false);
  });

  it("cut, copy, paste and select all are the standard text-editing roles", () => {
    const { template } = menu({ page: "editor" });
    expect(template[1].submenu!.filter((i) => i.role).map((i) => i.role)).toEqual(["cut", "copy", "paste", "selectAll"]);
  });

  it("View: member list, the poster's zoom, and the window's full screen", () => {
    const { template } = menu({ page: "editor" });
    expect(template[2].submenu!.map((i) => i.id ?? i.role ?? i.type)).toEqual(["toggle-sidebar", "separator", "zoom-in", "zoom-out", "zoom-reset", "separator", "togglefullscreen"]);
  });

  it("Help: About always; documentation and release notes only when the program has somewhere to send them", () => {
    expect(menu({ page: "editor" }).template[3].submenu!.map((i) => i.id)).toEqual(["about"]);
    const withLinks = menu({ page: "editor" }, { documentation: "https://example.test/readme", releases: "https://example.test/releases" });
    expect(withLinks.template[3].submenu!.map((i) => i.id ?? i.type)).toEqual(["documentation", "releases", "separator", "about"]);
    withLinks.item("documentation").click!();
    expect(withLinks.act.openLink).toHaveBeenCalledWith("documentation");
  });

  it("the page's report is kept to known fields", () => {
    expect(cleanState({ page: "editor", canUndo: 1, undoLabel: "x".repeat(200), sidebar: false, extra: "?" }))
      .toEqual({ page: "editor", canUndo: false, canRedo: false, undoLabel: null, redoLabel: null, sidebar: false });
    expect(cleanState("nonsense")).toEqual(EMPTY_STATE);
    expect(cleanState({ page: "admin" }).page).toBe("none");
  });
});

describe("the page's side of the menu", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("in a browser there is no menu: nothing listens, nothing is reported, nothing throws", () => {
    expect(inDesktop()).toBe(false);
    const stop = listenForCommands(() => ({ undo: () => { throw new Error("never"); } }));
    expect(() => stop()).not.toThrow();
    expect(() => reportDesktopState({ page: "editor" })).not.toThrow();
  });

  it("only known commands, with a well-formed file if any, reach the page", () => {
    expect(parseCommand({ type: "undo" })).toEqual({ type: "undo" });
    expect(parseCommand({ type: "rm -rf" })).toBeNull();
    expect(parseCommand("undo")).toBeNull();
    expect(parseCommand({ type: "open-project", file: { name: "a.shajarah", data: new Uint8Array([1]) } })?.file?.name).toBe("a.shajarah");
    expect(parseCommand({ type: "open-project", file: { name: "a", data: "not bytes" } })).toBeNull();
  });

  function bridged() {
    let listener: ((c: unknown) => void) | null = null;
    const reported: unknown[] = [];
    const bridge = {
      onCommand: vi.fn((l: (c: unknown) => void) => { listener = l; return () => { listener = null; }; }),
      reportState: vi.fn((s: unknown) => reported.push(s)),
    };
    vi.stubGlobal("window", { shajarahDesktop: bridge });
    return { bridge, reported, send: (c: unknown) => listener?.(c), listening: () => listener !== null };
  }

  it("in the desktop program each command runs the page's action for it, once, and stops when asked", () => {
    const { send, listening } = bridged();
    expect(inDesktop()).toBe(true);
    const undo = vi.fn(), sidebar = vi.fn();
    const stop = listenForCommands(() => ({ undo, "toggle-sidebar": sidebar }));
    send({ type: "undo" });
    send({ type: "toggle-sidebar" });
    send({ type: "zoom-in" }); // (no action for it here: ignored)
    send({ type: "nonsense" });
    expect(undo).toHaveBeenCalledOnce();
    expect(sidebar).toHaveBeenCalledOnce();
    stop();
    expect(listening()).toBe(false);
  });

  it("an action that fails is logged, not thrown back into the bridge", () => {
    const { send } = bridged();
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    listenForCommands(() => ({ redo: () => { throw new Error("boom"); } }));
    expect(() => send({ type: "redo" })).not.toThrow();
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });

  it("the page's state goes to the menu", () => {
    const { reported } = bridged();
    reportDesktopState({ page: "editor", canUndo: true, sidebar: false });
    expect(reported).toEqual([{ page: "editor", canUndo: true, sidebar: false }]);
  });

  it("undo and redo are the text field's while one is being typed in, the family's elsewhere", () => {
    const el = (tagName: string, type?: string, editable = false) => ({
      tagName, type,
      closest: (sel: string) => (editable && sel.includes("contenteditable")) || (tagName === "TEXTAREA" && sel.includes("textarea")) ? {} : null,
    }) as unknown as Element;
    expect(editingText(el("INPUT", "text"))).toBe(true);
    expect(editingText(el("INPUT", "search"))).toBe(true);
    expect(editingText(el("INPUT"))).toBe(true);
    expect(editingText(el("TEXTAREA"))).toBe(true);
    expect(editingText(el("DIV", undefined, true))).toBe(true);
    expect(editingText(el("INPUT", "checkbox"))).toBe(false);
    expect(editingText(el("BUTTON"))).toBe(false);
    expect(editingText(el("DIV"))).toBe(false);
    expect(editingText(null)).toBe(false);
  });
});
