const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("youtube",{
	download: (datas) => ipcRenderer.invoke("youtube:download",datas),
	info: (id,country) => ipcRenderer.invoke("youtube:info",id,country),
	request: (endpoint) => ipcRenderer.invoke("youtube:request",endpoint)
});