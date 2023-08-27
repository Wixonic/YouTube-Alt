import type { videoInfo as ytdlVideoInfo } from "ytdl-core";
import { contextBridge, ipcRenderer } from "electron";

export type videoInfo = ytdlVideoInfo;
export type yt = {
	info: (id: string, cache?: boolean) => Promise<videoInfo | void>;
};

contextBridge.exposeInMainWorld("youtube", {
	info: (id: string, cache?: boolean): Promise<videoInfo | void> => ipcRenderer.invoke("youtube:info", id, cache)
});