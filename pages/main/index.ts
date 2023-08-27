import type { yt } from "../preload.js";
import "../main.js";

declare const youtube: yt;
declare const videojs: any;

let player: any;

window.addEventListener("DOMContentLoaded", (): void => {
	player = videojs(document.querySelector("video"), {
		controls: true,
		muted: true
	});

	const audio = document.querySelector("audio");
	const searchInput: HTMLInputElement = document.querySelector("input#search");

	searchInput.addEventListener("search", (): void => {
		searchInput.blur();

		let id = "";

		if (true) {
			id = searchInput.value;
		}

		youtube.info(id)
			.then((value) => {
				if (value) {
					const thumbnails = value.videoDetails.thumbnails.sort((a, b) => a.width == b.width ? b.height - a.height : b.width - a.width);
					const formats = value.formats;
					const audioDownloadFormats = formats.filter((format) => format.hasAudio && !format.hasVideo).sort((a, b) => b.audioBitrate - a.audioBitrate);
					const audioFormats = audioDownloadFormats.filter((format) => MediaSource.isTypeSupported(format.mimeType));
					const videoDownloadFormats = formats.filter((format) => format.hasVideo && !format.hasAudio).sort((a, b) => a.width == b.width ? (a.fps == b.fps ? b.bitrate - a.bitrate : b.fps - a.fps) : b.width - a.width);
					const videoFormats = videoDownloadFormats.filter((format) => MediaSource.isTypeSupported(format.mimeType));

					searchInput.value = "";

					console.log(id, thumbnails, audioDownloadFormats, videoDownloadFormats, audioFormats, videoFormats);

					player.loadMedia({
						poster: thumbnails[0].url,
						src: {
							src: videoFormats[0].url,
							type: videoFormats[0].mimeType
						}
					});

					audio.innerHTML = `<source type="${audioFormats[0].mimeType}" src="${audioFormats[0].url}" />`;

					player.on("play", () => audio.play());
					player.on("pause", () => audio.pause());
					player.on("seeking", () => audio.play());
					player.on("seeked", () => audio.play());

					const update = () => {
						audio.currentTime = player.currentTime;

						if (audio.parentElement instanceof HTMLElement) requestAnimationFrame(update);
					};
				}
			}).catch(console.warn);
	});
});