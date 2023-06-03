const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("youtube",{
	request: async (endpoint) => await ipcRenderer.invoke("youtube:request",endpoint)
});