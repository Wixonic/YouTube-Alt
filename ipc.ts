import { IpcMainInvokeEvent, ipcMain } from "electron";
import { getURLVideoID } from "ytdl-core";

import { getInfo, videoInfo } from "./youtube";

ipcMain.handle("youtube:info", async (event: IpcMainInvokeEvent, id: string, cache?: boolean): Promise<videoInfo | void> => getInfo(id, cache));
ipcMain.handle("youtube:getURLVideoID", async (event: IpcMainInvokeEvent, url: string): Promise<string | void> => {
	try {
		return getURLVideoID(url);
	} catch { }
});