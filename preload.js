const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("catCowork", {
  // Pet → Main
  petClicked: () => ipcRenderer.send("pet:clicked"),
  petDrag: (dx, dy) => ipcRenderer.send("pet:drag", dx, dy),
  openURL: (url) => ipcRenderer.send("open:url", url),

  // Main → Pet
  onPetState: (callback) =>
    ipcRenderer.on("pet:state", (_e, state) => callback(state)),

  // Chat → Main
  sendMessage: (msg) => ipcRenderer.invoke("chat:send", msg),
  clearHistory: () => ipcRenderer.invoke("chat:clear"),
});
