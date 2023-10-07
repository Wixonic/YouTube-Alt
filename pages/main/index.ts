import type { playerCache, yt, audioFormat, videoFormat, thumbnail } from "../preload.js";
import "../main.js";

declare const playerCache: playerCache;
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

	refresh: () => Promise<void>
} = {
	get audio() {
		return document.querySelector("audio")
	},

	get video() {
		return document.querySelector("video")
	},

	current: {
		id: {}
	},
	datas: {},

	async refresh() {
		playerCache.cancel();

		if (!player.current.id.audio) {
			player.current.id.audio = 0;
		}

		if (!player.current.id.video) {
			player.current.id.video = 0;
		}

		player.current.audio = player.datas.audioFormats[player.current.id.audio];
		player.current.video = player.datas.videoFormats[player.current.id.video];

		player.audio.innerHTML = `<source type="${player.current.audio.mimeType}" src="file://${await playerCache.load(`${player.datas.id}/audio/${player.current.id.audio}.${player.current.audio.container}`, player.current.audio)}" />`;
		player.video.innerHTML = `<source type="${player.current.video.mimeType}" src="file://${await playerCache.load(`${player.datas.id}/video/${player.current.id.video}.${player.current.video.container}`, player.current.video)}" />`;
		player.video.poster = player.datas.thumbnail.url;
		player.video.style.aspectRatio = `${player.current.video.width} / ${player.current.video.height}`;

		player.video.addEventListener("play", () => {
			player.audio.currentTime = player.video.currentTime;
			player.audio.play();
		});
		player.video.addEventListener("pause", () => {
			player.audio.currentTime = player.video.currentTime;
			player.audio.pause();
		});

		player.audio.addEventListener("play", () => {
			player.video.currentTime = player.audio.currentTime;
			player.video.play();
		});
		player.audio.addEventListener("pause", () => {
			player.video.currentTime = player.audio.currentTime;
			player.video.pause();
		});
	},
};

window.addEventListener("DOMContentLoaded", (): void => {
	const searchInput: HTMLInputElement = document.querySelector("input#search");

	searchInput.addEventListener("search", async (): Promise<void> => {
		searchInput.blur();

		player.datas.id = await youtube.getURLVideoID(searchInput.value) || "dQw4w9WgXcQ";

		youtube.info(player.datas.id)
			.then((value) => {
				if (value) {
					player.datas.formats = value.formats;
					player.datas.audioDownloadFormats = player.datas.formats.filter((format) => format.hasAudio && !format.hasVideo).sort((a, b) => b.audioBitrate - a.audioBitrate);
					player.datas.audioFormats = player.datas.audioDownloadFormats.filter((format) => MediaSource.isTypeSupported(format.mimeType));
					player.datas.videoDownloadFormats = player.datas.formats.filter((format) => format.hasVideo && !format.hasAudio).sort((a, b) => a.width == b.width ? (a.fps == b.fps ? b.bitrate - a.bitrate : b.fps - a.fps) : b.width - a.width);
					player.datas.videoFormats = player.datas.videoDownloadFormats.filter((format) => MediaSource.isTypeSupported(format.mimeType));
					player.datas.thumbnail = value.videoDetails.thumbnails.sort((a, b) => a.width == b.width ? b.height - a.height : b.width - a.width)[0];

					if (player.datas.videoFormats[0].isHLS || player.datas.videoFormats[0].isDashMPD) {
						alert("Live videos aren't supported.");
					} else {
						player.refresh();
					}

					searchInput.value = "";
				}
			}).catch(console.warn);
	});
});