// The recovery window's only bridge: named actions carried out by the main
// process (see recoveryWindow in main.js). Nothing else of Node reaches it.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("recovery", {
  run: (action) => ipcRenderer.invoke("shajarah:recovery", action),
});
