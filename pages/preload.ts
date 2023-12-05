import type { videoInfo as ytdlVideoInfo, videoFormat as ytdlVideoFormat, thumbnail as ytdlThumbnail } from "ytdl-core";
import { contextBridge, ipcRenderer } from "electron";

export type audioFormat = ytdlVideoFormat;
export type videoInfo = ytdlVideoInfo;
export type videoFormat = ytdlVideoFormat;
export type thumbnail = ytdlThumbnail;

export type process = {
	isDev: () => boolean;
};

export type yt = {
	info: (id: string, cache?: boolean) => Promise<videoInfo | void>;
	getURLVideoID: (url: string) => Promise<string | void>;
};

contextBridge.exposeInMainWorld("process", {
	isDev: () => process.env.APP_DEV ? (process.env.APP_DEV.trim() == "true") : false
});

contextBridge.exposeInMainWorld("youtube", {
	info: (id: string, cache?: boolean): Promise<videoInfo | void> => ipcRenderer.invoke("youtube:info", id, cache),
	getURLVideoID: (url: string): Promise<string | void> => ipcRenderer.invoke("youtube:getURLVideoID", url)
});

ipcRenderer.on("fullscreen", (event, isFullscreen) => document.body.setAttribute("fullscreen", isFullscreen));