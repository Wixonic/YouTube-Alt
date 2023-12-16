import type { process, yt, audioFormat, videoFormat, thumbnail } from "../preload.js";

declare const process: process;
declare const youtube: yt;

const player: {
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

	start: () => void,
	refresh: () => Promise<void>
} = {
	current: {
		id: {}
	},
	datas: {},

	start() {
		player.video.style.background = `no-repeat center/contain url("${player.datas.thumbnail.url}")`;

		player.refresh();
	},

	async refresh() {
		const currentTime = player.video.currentTime;

		if (!player.current.id.video) player.current.id.video = 0;
		if (!player.current.id.audio) player.current.id.audio = 0;

		player.current.video = player.datas.videoFormats[player.current.id.video];
		player.current.audio = player.datas.audioFormats[player.current.id.audio];

		player.video.currentTime = currentTime;

		const peek = await fetch(player.current.video.url, {
			headers: {
				Range: "bytes=0-1"
			}
		});

		const length = parseInt(peek.headers.get("Content-Range").split("/")[1]);



		await player.video.play();
	}
};

window.addEventListener("DOMContentLoaded", async (): Promise<void> => {
	player.video = document.getElementsByTagName("video")[0];

	const url = new URL(location.href);

	if (url.searchParams.has("v")) {
		player.datas.id = url.searchParams.get("v");

		youtube.info(player.datas.id)
			.then((value) => {
				if (value) {
					player.datas.formats = value.formats;
					player.datas.videoDownloadFormats = player.datas.formats.filter((format) => format.hasVideo && !format.hasAudio).sort((a, b) => a.width == b.width ? (a.fps == b.fps ? b.bitrate - a.bitrate : b.fps - a.fps) : b.width - a.width);
					player.datas.videoFormats = player.datas.videoDownloadFormats.filter((format) => MediaSource.isTypeSupported(format.mimeType));
					player.datas.audioDownloadFormats = player.datas.formats.filter((format) => format.hasAudio && !format.hasVideo).sort((a, b) => b.audioBitrate - a.audioBitrate);
					player.datas.audioFormats = player.datas.audioDownloadFormats.filter((format) => MediaSource.isTypeSupported(format.mimeType));
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
		url.searchParams.set("v", "eMSVjMA1UdY");
		location.href = url.href;
	}
	// DEV

	searchInput.addEventListener("search", async (e: InputEvent): Promise<void> => {
		const target: HTMLInputElement = <HTMLInputElement>e.target;

		target.blur();

		const id = await youtube.getURLVideoID(target.value);

		if (id) {
			target.value = "";
			url.searchParams.set("v", id);
			location.href = url.href;
		} else {
			target.value = "";
			alert("Search is not implemented: type the video URL instead.");
		}
	});
});