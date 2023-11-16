import type { process, yt, audioFormat, videoFormat, thumbnail } from "../preload.js";

declare const process: process;
declare const youtube: yt;

const player: {
	audio?: HTMLAudioElement,
	video?: HTMLVideoElement,

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
	refresh: () => Promise<void>
} = {
	current: {
		id: {}
	},
	datas: {},

	started: false,

	start() {
		player.video.poster = player.datas.thumbnail.url;

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
	}
};

window.addEventListener("DOMContentLoaded", async (): Promise<void> => {
	player.audio = document.querySelector("main #player .video video audio");
	player.video = document.querySelector("main #player .video video");

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
		url.searchParams.set("v", "fZXbgWidTBQ");
		location.href = url.href;
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