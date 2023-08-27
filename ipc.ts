import { IpcMainInvokeEvent, ipcMain } from "electron";

import { getInfo, videoInfo } from "./youtube";

ipcMain.handle("youtube:info", async (event: IpcMainInvokeEvent, id: string, cache?: boolean): Promise<videoInfo | void> => getInfo(id, cache));