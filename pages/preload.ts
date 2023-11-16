import type { videoInfo as ytdlVideoInfo, videoFormat as ytdlVideoFormat, thumbnail as ytdlThumbnail } from "ytdl-core";
import { contextBridge, ipcRenderer } from "electron";

export type audioFormat = ytdlVideoFormat;
export type videoInfo = ytdlVideoInfo;
export type videoFormat = ytdlVideoFormat;
export type thumbnail = ytdlThumbnail;

export type playerCache = {
	cancel: () => Promise<void>;
	load: (path: string, url: audioFormat | videoFormat) => Promise<string>;
};

export type yt = {
	info: (id: string, cache?: boolean) => Promise<videoInfo | void>;
	getURLVideoID: (url: string) => Promise<string | void>;
};

contextBridge.exposeInMainWorld("playerCache", {
	cancel: (): Promise<void> => ipcRenderer.invoke("playerCache:cancel"),
	load: (path: string, url: audioFormat | videoFormat): Promise<string> => ipcRenderer.invoke("playerCache:load", path, url)
});

contextBridge.exposeInMainWorld("youtube", {
	info: (id: string, cache?: boolean): Promise<videoInfo | void> => ipcRenderer.invoke("youtube:info", id, cache),
	getURLVideoID: (url: string): Promise<string | void> => ipcRenderer.invoke("youtube:getURLVideoID", url)
});