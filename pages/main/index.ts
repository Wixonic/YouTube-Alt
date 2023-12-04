import type { process, yt, audioFormat, videoFormat, thumbnail } from "../preload.js";

declare const process: process;
declare const youtube: yt;

const player: {
	audio: HTMLAudioElement,
	video: HTMLVideoElement,
	canvas?: HTMLCanvasElement,

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
	displaying: boolean,

	start: () => void,
	refresh: () => Promise<void>,
	display: () => void
} = {
	audio: document.createElement("audio"),
	video: document.createElement("video"),

	current: {
		id: {}
	},
	datas: {},

	started: false,
	displaying: false,

	start() {
		player.canvas.style.background = `no-repeat center/contain url("${player.datas.thumbnail.url}")`;

		let button: HTMLButtonElement;

		// Synchronize video and audio
		// Controls

		player.refresh();
	},

	async refresh() {
		const currentTime = player.video.currentTime;

		if (!player.current.id.audio) player.current.id.audio = 0;
		if (!player.current.id.video) player.current.id.video = 0;

		player.current.audio = player.datas.audioFormats[player.current.id.audio];
		player.current.video = player.datas.videoFormats[player.current.id.video];

		// Video player

		player.audio.currentTime = currentTime;
		player.video.currentTime = currentTime;
	},

	display() {
		if (player.displaying) {
			player.canvas.width = player.video.width;
			player.canvas.height = player.video.height;

			const ctx = player.canvas.getContext("2d");
			ctx.drawImage(player.video, 0, 0);
		}

		requestAnimationFrame(() => player.display());
	}
};

window.addEventListener("DOMContentLoaded", async (): Promise<void> => {
	player.canvas = document.getElementsByTagName("canvas")[0];
	player.display();

	// Fullscreen depends on Window Fullscreen

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

	const searchInput = document.getElementById("search") as HTMLInputElement;

	// DEV
	if (process.isDev() && !url.searchParams.has("v")) {
		url.searchParams.set("v", "fZXbgWidTBQ");
		location.href = url.href;
	}
	// DEV

	searchInput.addEventListener("search", async (): Promise<void> => {
		searchInput.blur();

		const id = await youtube.getURLVideoID(searchInput.value);

		if (id) {
			searchInput.value = "";
			url.searchParams.set("v", id);
			location.href = url.href;
		} else {
			searchInput.value = "";
			alert("Search is not implemented: type the video URL instead.");
		}
	});
});