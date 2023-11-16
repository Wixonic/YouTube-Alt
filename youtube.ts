import { app } from "electron";
import fs from "fs";
import ytdl from "ytdl-core";

export type videoFormat = ytdl.videoFormat;
export type videoInfo = ytdl.videoInfo;

export const getInfo = async (id: string, cache: boolean = true): Promise<ytdl.videoInfo | void> => {
	if (ytdl.validateID(id)) {
		const cacheDir = `${app.getPath("temp")}YouTube Alt/videos/infos`;
		const cachePath = `${cacheDir}/${id}.json`;

		if (fs.existsSync(cachePath) && cache) return JSON.parse(fs.readFileSync(cachePath, { encoding: "utf-8" }));

		const info = await ytdl.getInfo(id);
		if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
		fs.writeFileSync(cachePath, JSON.stringify(info), { encoding: "utf-8" });
		console.log("Info cached for " + id);
		return info;
	} else return;
};