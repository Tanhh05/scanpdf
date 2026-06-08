const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("scanpdf", {
  getConfig: () => ipcRenderer.invoke("config:get"),
  setApiUrl: (url) => ipcRenderer.invoke("config:set-api-url", url),
  login: (credentials) => ipcRenderer.invoke("auth:login", credentials),
  logout: () => ipcRenderer.invoke("auth:logout"),
  selectFiles: (options) => ipcRenderer.invoke("files:select", options),
  createConversion: (payload) => ipcRenderer.invoke("convert:create", payload),
  listConversions: () => ipcRenderer.invoke("conversions:list"),
  getConversion: (id) => ipcRenderer.invoke("conversions:get", id),
  downloadConversion: (conversion) => ipcRenderer.invoke("conversions:download", conversion),
  openExternal: (url) => ipcRenderer.invoke("shell:open", url),
});
