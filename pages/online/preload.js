const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("youtube",{
	download: (datas) => ipcRenderer.invoke("youtube:download",datas),
	info: (id,country) => ipcRenderer.invoke("youtube:info",id,country),
	request: (endpoint) => ipcRenderer.invoke("youtube:request",endpoint)
});

contextBridge.exposeInMainWorld("downloads",{
	info: (id) => ipcRenderer.invoke("downloads:info",id),
	list: () => ipcRenderer.invoke("downloads:list")
});