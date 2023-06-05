const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("youtube",{
	combine: (audio,video) => ipcRenderer.invoke("youtube:combine",audio,video),
	convert: (file,format) => ipcRenderer.invoke("youtube:convert",file,format),
	info: (id,country) => ipcRenderer.invoke("youtube:info",id,country),
	request: (endpoint) => ipcRenderer.invoke("youtube:request",endpoint)
});