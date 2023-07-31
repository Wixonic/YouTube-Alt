const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("isDev",() => ipcRenderer.invoke("isDev"));

contextBridge.exposeInMainWorld("downloader", {
	onFail: (callback) => ipcRenderer.on("fail", callback),
	onNew: (callback) => ipcRenderer.on("new", callback),
	onProgress: (callback) => ipcRenderer.on("progress", callback),
	onSuccess: (callback) => ipcRenderer.on("success", callback),
	onUpdate: (callback) => ipcRenderer.on("update", callback)
});