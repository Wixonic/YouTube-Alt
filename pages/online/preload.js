const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("isDev",() => ipcRenderer.invoke("isDev"));

contextBridge.exposeInMainWorld("discord", {
	rpc: (datas) => ipcRenderer.invoke("discord:rpc", datas)
});

contextBridge.exposeInMainWorld("download", (datas) => ipcRenderer.invoke("download", datas));

contextBridge.exposeInMainWorld("youtube", {
	download: (datas) => ipcRenderer.invoke("youtube:download", datas),
	info: (id, country) => ipcRenderer.invoke("youtube:info", id, country),
	request: (endpoint) => ipcRenderer.invoke("youtube:request", endpoint)
});