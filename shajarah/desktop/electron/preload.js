// The one bridge between the desktop program and the page: the page can
// listen for menu commands and report what the menu should offer; nothing
// else of Electron or Node reaches it. (The page works the same without it,
// in a browser.)

const { contextBridge, ipcRenderer } = require("electron");

const COMMAND = "shajarah:command";
const STATE = "shajarah:state";

contextBridge.exposeInMainWorld("shajarahDesktop", {
  /**
   * Calls `listener(command)` for each menu command; returns a function
   * that stops listening. A command is { type, file? }, file being one the
   * person chose in the program's own Open dialog: { name, data }.
   */
  onCommand(listener) {
    if (typeof listener !== "function") return () => {};
    const handler = (_event, command) => listener(command);
    ipcRenderer.on(COMMAND, handler);
    return () => ipcRenderer.removeListener(COMMAND, handler);
  },
  /** What the menu should offer now (an editor open, undo, the member list…). */
  reportState(state) {
    ipcRenderer.send(STATE, state);
  },
});
