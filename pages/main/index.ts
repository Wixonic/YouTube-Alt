import type { playerCache, process, yt, audioFormat, videoFormat, thumbnail } from "../preload.js";
import "../main.js";

declare const playerCache: playerCache;
declare const process: process;
declare const youtube: yt;

const player: {
	canvas?: HTMLCanvasElement,
	audio?: HTMLAudioElement,
	video?: HTMLVideoElement,
	thumbnail?: HTMLImageElement,

	current: {
		id: {
			audio?: number,
			video?: number
		},
		audio?: audioFormat,
		video?: videoFormat
	},

	datas: {
		id?: string,
		formats?: videoFormat[],
		audioDownloadFormats?: audioFormat[],
		audioFormats?: audioFormat[],
		videoDownloadFormats?: videoFormat[],
		videoFormats?: videoFormat[],
		thumbnail?: thumbnail
	},

	started: boolean,

	start: () => void,
	refresh: () => Promise<void>,
	draw: () => void
} = {
	audio: document.createElement("audio"),
	video: document.createElement("video"),
	thumbnail: document.createElement("img"),

	current: {
		id: {}
	},
	datas: {},

	started: false,

	start() {
		player.thumbnail.onload = () => player.draw();
		player.thumbnail.src = player.datas.thumbnail.url;

		playerCache.onProgress((event, current, total) => {
			if (current == total) document.getElementById("loader").style.display = "none";
			else {
				document.getElementById("loader").style.removeProperty("display");
			}
		});

		player.refresh();
	},

	async refresh() {
		playerCache.cancel();

		if (!player.current.id.audio) player.current.id.audio = 0;
		if (!player.current.id.video) player.current.id.video = 0;

		player.current.audio = player.datas.audioFormats[player.current.id.audio];
		player.current.video = player.datas.videoFormats[player.current.id.video];

		const audioPath = await playerCache.load(`${player.datas.id}/audio/${player.current.id.audio}.${player.current.audio.container}`, player.current.audio);
		player.audio.src = `file://${audioPath}`;

		const videoPath = await playerCache.load(`${player.datas.id}/video/${player.current.id.video}.${player.current.video.container}`, player.current.video);
		player.video.src = `file://${videoPath}`;
	},

	draw() {
		player.canvas.width = player.started ? player.video.width : player.thumbnail.width;
		player.canvas.height = player.started ? player.video.height : player.thumbnail.height;

		const ctx = player.canvas.getContext("2d");
		ctx.drawImage(player.started ? player.video : player.thumbnail, 0, 0);

		player.video.requestVideoFrameCallback(player.draw);
	}
};

window.addEventListener("DOMContentLoaded", async (): Promise<void> => {
	player.canvas = document.querySelector("canvas");

	const url = new URL(location.href);

	if (url.searchParams.has("v")) {
		player.datas.id = url.searchParams.get("v");

		youtube.info(player.datas.id)
			.then((value) => {
				if (value) {
					player.datas.formats = value.formats;
					player.datas.audioDownloadFormats = player.datas.formats.filter((format) => format.hasAudio && !format.hasVideo).sort((a, b) => b.audioBitrate - a.audioBitrate);
					player.datas.audioFormats = player.datas.audioDownloadFormats.filter((format) => MediaSource.isTypeSupported(format.mimeType));
					player.datas.videoDownloadFormats = player.datas.formats.filter((format) => format.hasVideo && !format.hasAudio).sort((a, b) => a.width == b.width ? (a.fps == b.fps ? b.bitrate - a.bitrate : b.fps - a.fps) : b.width - a.width);
					player.datas.videoFormats = player.datas.videoDownloadFormats.filter((format) => MediaSource.isTypeSupported(format.mimeType));
					player.datas.thumbnail = value.videoDetails.thumbnails.sort((a, b) => a.width == b.width ? b.height - a.height : b.width - a.width)[0];

					if (player.datas.videoFormats[0].isHLS || player.datas.videoFormats[0].isDashMPD) alert("Live videos aren't supported.");
					else player.start();

					searchInput.value = "";
				}
			}).catch(console.warn);
	}

	const searchInput: HTMLInputElement = document.querySelector("input#search");

	// DEV
	if (process.isDev() && !url.searchParams.has("v")) {
		searchInput.value = "https://www.youtube.com/watch?v=fZXbgWidTBQ";
		const id = await youtube.getURLVideoID(searchInput.value);

		if (id) {
			url.searchParams.set("v", id);
			location.href = url.href;
		}
	}
	// DEV

	searchInput.addEventListener("search", async (): Promise<void> => {
		searchInput.blur();

		const id = await youtube.getURLVideoID(searchInput.value);

		if (id) {
			url.searchParams.set("v", id);
			location.href = url.href;
		}
	});
});