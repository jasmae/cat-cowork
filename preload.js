const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("catCowork", {
  // Pet → Main
  petClicked: () => ipcRenderer.send("pet:clicked"),
  petDrag: (dx, dy) => ipcRenderer.send("pet:drag", dx, dy),
  openURL: (url) => ipcRenderer.send("open:url", url),
  minimizeChat: () => ipcRenderer.send("chat:minimize"),
  closeChat: () => ipcRenderer.send("chat:close"),
  petHover: (hovering) => ipcRenderer.send("pet:hover", hovering),

  // Main → Pet
  onPetState: (callback) =>
    ipcRenderer.on("pet:state", (_e, state) => callback(state)),

  // Chat → Main
  sendMessage: (msg) => ipcRenderer.invoke("chat:send", msg),
  clearHistory: () => ipcRenderer.invoke("chat:clear"),
});
