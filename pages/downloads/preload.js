const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("downloader", {
	onNew: (callback) => ipcRenderer.on("new", callback),
	onProgress: (callback) => ipcRenderer.on("progress", callback)
});