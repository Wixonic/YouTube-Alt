import { IpcMainInvokeEvent, app, ipcMain } from "electron";
import { EventEmitter } from "events";
import fs from "fs";
import { ClientRequest } from "http";
import { get } from "https";
import { getURLVideoID } from "ytdl-core";

import { getInfo, videoFormat, videoInfo } from "./youtube";

class Downloader extends EventEmitter {
	static chunkSize = 1024 * 1024 * 10;
	static list: Downloader[] = [];

	directory: string;
	file: string;
	length: number;
	path: string;
	request: ClientRequest;
	stream: fs.WriteStream;
	url: string;

	constructor(path: string, format: videoFormat) {
		super();

		this.directory = `${app.getPath("temp")}/YouTube Alt/player/cache/${path.substring(0, (path.lastIndexOf("/")))}`;

		if (!fs.existsSync(this.directory)) fs.mkdirSync(this.directory, { recursive: true });

		this.file = path.substring((path.lastIndexOf("/")) + 1);
		this.path = [this.directory, this.file].join("/");
		this.stream = fs.createWriteStream(this.path);
		this.url = format.url;

		this.download().then(() => this.emit("loaded"));
	};

	abort(): void {
		this.request.destroy();
		this.stream.destroy();
	};

	download(): Promise<void> {
		return new Promise((resolve): void => {
			const range = {
				start: 0,
				end: 0
			};

			this.request = get(this.url, {
				headers: {
					"Range": `bytes=0-0`
				}
			}, async (res): Promise<void> => {
				const length = Number((res.headers["content-range"] || "").split("/")[1]);

				const downloadRange = (): Promise<void> => new Promise((resolve): void => {
					range.start = range.end;
					range.end = Math.min(range.start + Downloader.chunkSize, length);

					console.log(`${range.start}-${range.end - 1}`);

					this.request = get(this.url, {
						headers: {
							"Range": `bytes=${range.start}-${range.end - 1}`
						}
					}, (res): void => {
						res.on("data", (chunk): boolean => this.stream.write(chunk));
						res.on("end", (): void => resolve(null));
					});
				});

				while (range.end < length) {
					try {
						await downloadRange();
						this.emit("progress", range.end, length);
					} catch (e) {
						console.error("Failed to download:", e);
					}
				}

				this.stream.end();
				resolve();
			});
		});
	};
};

ipcMain.handle("playerCache:cancel", async (event: IpcMainInvokeEvent): Promise<void> => {
	for (let x = 0; x < Downloader.list.length; ++x) {
		const process = Downloader.list[x];
		process.abort();
		delete Downloader.list[x];
	}
});

ipcMain.handle("playerCache:load", (event: IpcMainInvokeEvent, path: string, format: videoFormat): Promise<string> => new Promise((resolve): void => {
	const process = new Downloader(path, format);
	process.on("progress", (current: number, total: number) => event.sender.send("playerCache:progress", current, total));
	process.once("loaded", ((): void => resolve(String(process.stream.path))));
}));

ipcMain.handle("youtube:info", async (event: IpcMainInvokeEvent, id: string, cache?: boolean): Promise<videoInfo | void> => getInfo(id, cache));
ipcMain.handle("youtube:getURLVideoID", async (event: IpcMainInvokeEvent, url: string): Promise<string | void> => {
	try {
		return getURLVideoID(url);
	} catch { }
});