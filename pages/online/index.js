const actx = new AudioContext();

const Pages = {
	set: (page="home",...args) => {
		Pages.utils.clear();
		Pages.utils.set(page);
		Pages.utils.footer.set(page);
		(Pages.list[page] || (() => Pages.utils.error("Page not found",page)))(...args);
	},

	list: {
		home: () => {
			youtube.request(`/videos?chart=mostPopular${channels && channels.length > currentChannel && channels[currentChannel]?.snippet?.country ? "&regionCode=" + channels[currentChannel].snippet.country : ""}&maxResults=50&fields=items(id)`)
			.then((videos) => {
				for (let video of videos.datas.items) {
					const append = (html="") => {
						const videoEl = document.createElement("div");
						videoEl.className = "video";
						videoEl.id = video.id;
						videoEl.addEventListener("click",() => Pages.set("video",video.id));
						videoEl.innerHTML = html;
						document.querySelector("div.main").append(videoEl);
					};

					youtube.info(video.id,channels && channels.length > currentChannel ? channels[currentChannel]?.snippet?.country : null)
					.then((datas) => {
						append(`<div class="title">${datas.videoDetails.title}</div><img class="thumbnail" src="${datas.videoDetails.thumbnails[datas.videoDetails.thumbnails.length - 1].url}" /><div class="channel"><img class="logo" src="${datas.videoDetails.author.thumbnails[datas.videoDetails.author.thumbnails.length - 1].url}" /><div class="title">${datas.videoDetails.author.name}</div></div>`);
					}).catch((e) => {
						append(`Failed to fetch info of "${video.id}"`);
						console.error(e);
					});
				}
			}).catch((e) => Pages.utils.error("Failed to fetch homepage",e));
		},
		video: (id) => {
			youtube.info(id,channels && channels.length > currentChannel ? channels[currentChannel]?.snippet?.country : null)
			.then((datas) => {
				const formats = {};
				for (let format of datas.formats) {
					const id = format.hasVideo ? `${Math.min(format.width,format.height)}p${format.fps}` : "Audio";
					if (!formats[id] && (format.container === "mp4" || format.container === "webm") && format.projectionType === "RECTANGULAR" && !format.isLive) {
						formats[id] = {
							container: format.container,
							duration: format.approxDurationMs / 1000,
							height: format.height,
							id,
							hasAudio: format.hasAudio,
							hasVideo: format.hasVideo,
							size: Number(format.contentLength),
							url: format.url,
							width: format.width
						};
					}
				}

				formats.list = Object.values(formats);
				formats.videoList = formats.list.filter((format) => format.hasVideo);
				formats.videoList.sort((a,b) => (a.height == b.height ? (a.width == b.width ? (a.fps == b.fps ? a.hasAudio && !b.hasAudio : a.fps > b.fps) : a.width > b.width) : a.height > b.height) ? -1 : 1);
				
				const player = document.createElement("div");

				player.play = (format) => {
					videoElement.innerHTML = "";
					videoElement.removeAttribute("poster");
					controls.style.display = "none";

					const videoSource = document.createElement("source");
					videoSource.type = `video/${format.container}`;
					videoSource.src = format.url;
					videoElement.append(videoSource);

					videoElement.addEventListener("loadedmetadata",() => {
						controls.style.display = "grid";
						videoElement.poster = datas.videoDetails.thumbnails[datas.videoDetails.thumbnails.length - 1].url;
					});

					videoElement.addEventListener("error",() => {
						controls.style.display = "grid";
						videoElement.innerHTML = `<p><b>This video is unavailable</b></p><p>This may due to:<ul><li>Your network connection</li><li>Your device that doesn't support this quality</li><li>A server error from YouTube</li></ul></p><p>Check your internet connection, try to choose a lower quality, restart the app or try to download the video with mp4.</p>`;
					});

					if (formats["Audio"]) {
						videoElement.muted = true;
						audioElement.type = `audio/${formats["Audio"].container}`;
						audioElement.src = formats["Audio"].url;

						const audioSource = actx.createMediaElementSource(audioElement);
						audioSource.connect(actx.destination);

						audioElement.addEventListener("play",() => videoElement.play());
						audioElement.addEventListener("pause",() => videoElement.pause());

						videoElement.addEventListener("play",() => audioElement.play());
						videoElement.addEventListener("pause",() => audioElement.pause());

						audioElement.addEventListener("seeking",() => videoElement.playbackRate = 0);
						audioElement.addEventListener("seeked",async () => {
							if (videoElement.readyState < 3) {
								await new Promise((resolve) => videoElement.addEventListener("canplaythrough",resolve));
							}
							videoElement.playbackRate = 1;
						});

						videoElement.addEventListener("seeking",() => audioElement.playbackRate = 0);
						videoElement.addEventListener("seeked",async () => {
							if (audioElement.readyState < 3) {
								await new Promise((resolve) => audioElement.addEventListener("canplaythrough",resolve));
							}
							audioElement.playbackRate = 1;
						});

						videoElement.addEventListener("progress",() => {
							const start = videoElement.buffered.start();
						});

						const synchronize = () => {
							if (Math.sqrt(Math.pow(audioElement.currentTime - videoElement.currentTime,2)) > 0.1) {
								videoElement.currentTime = audioElement.currentTime;
							}
						};

						audioElement.addEventListener("timeupdate",synchronize);
						videoElement.addEventListener("timeupdate",() => {
							cursor.style.left = `${videoElement.currentTime / videoElement.duration * 100}%`;
							synchronize();
						});
					}
				};

				const audioElement = document.createElement("audio");
				const videoElement = document.createElement("video");
				const controls = document.createElement("div");
				const statusButton = document.createElement("button");
				const settingsButton = document.createElement("button");
				const settingsPopup = document.createElement("div");
				const pipButton = document.createElement("button");
				const fullscreenButton = document.createElement("button");
				const progressBarContainer = document.createElement("div");
				const progressBar = document.createElement("div");
				const cursor = document.createElement("div");
				const info = document.createElement("div");
				const author = document.createElement("div");

				player.classList.add("player");
				controls.classList.add("controls");
				statusButton.classList.add("status");
				settingsButton.classList.add("settings");
				pipButton.classList.add("pip");
				fullscreenButton.classList.add("fullscreen");
				progressBarContainer.classList.add("bar");
				progressBar.classList.add("bar");
				cursor.classList.add("cursor");
				info.classList.add("info");
				author.classList.add("author");

				videoElement.preload = "auto";

				controls.addEventListener("mousenter",() => controls.classList.add("visible"));
				controls.addEventListener("mousemove",() => {
					if (controls.previousTimeout) {
						clearTimeout(controls.previousTimeout);
					}

					controls.classList.add("visible");
					controls.previousTimeout = setTimeout(() => {
						if (videoElement.played) {
							controls.classList.remove("visible");
						}
					},2000);
				});
				controls.addEventListener("mouseout",() => controls.classList.remove("visible"));
				controls.addEventListener("mouseleave",() => controls.classList.remove("visible"));
				controls.addEventListener("pause",() => controls.classList.add("visible"));

				statusButton.addEventListener("click",() => videoElement.paused ? videoElement.play() : videoElement.pause());
				videoElement.addEventListener("play",() => statusButton.classList.add("playing"));
				videoElement.addEventListener("pause",() => statusButton.classList.remove("playing"));
				pipButton.addEventListener("click",() => document.pictureInPictureElement instanceof Element ? document.exitPictureInPicture() : videoElement.requestPictureInPicture());
				fullscreenButton.addEventListener("click",() => document.fullscreenElement instanceof Element ? document.exitFullscreen() : player.requestFullscreen({navigationUI: "hide"}));
				document.addEventListener("fullscreenchange",() => fullscreenButton.classList.toggle("enabled",document.fullscreenElement instanceof Element));
				
				const observer = new ResizeObserver(() => {
					const playerComputedStyle = getComputedStyle(player);
					const videoComputedStyle = getComputedStyle(videoElement);

					controls.style.left = `calc(${playerComputedStyle.marginLeft} + (${videoComputedStyle.width} - ${videoElement.videoWidth / videoElement.videoHeight * Number(videoComputedStyle.height.replace("px",""))}px) / 2)`;
					controls.style.height = videoComputedStyle.height;

					controls.style.aspectRatio = videoElement.style.aspectRatio = `${videoElement.videoWidth} / ${videoElement.videoHeight}`;
				});
				observer.observe(videoElement);
				observer.observe(document.documentElement);

				videoElement.append(audioElement);
				progressBarContainer.append(progressBar,cursor);
				controls.append(statusButton,settingsButton,progressBarContainer);
				if (document.pictureInPictureEnabled) controls.append(pipButton);
				if (document.fullscreenEnabled) controls.append(fullscreenButton);
				player.append(videoElement,controls,settingsPopup);
				info.append(author);
				document.querySelector("div.main").append(player,info);

				player.play(formats.videoList[0]);
			}).catch((e) => Pages.utils.error(`Failed to fetch info of "${id}"`,e));
		}
	},

	utils: {
		clear: () => document.querySelector("div.main").innerHTML = "",
		set: (page) => document.querySelector("div.main").setAttribute("page",page),
		error: (text,error) => {
			Pages.utils.clear();
			Pages.utils.set("error");
			document.querySelector("div.main").innerHTML = `<p><b>${text || "An unknown error occured"}</b><br /><code>${error || "No log found"}</code></p>`;
		},
		footer: {
			clear: () => {
				const buttons = document.querySelectorAll("footer > button.selected");
				for (let x = 0; x < buttons.length; ++x) {
					buttons[x].classList.remove("selected");
				}
			},

			set: (name="home") => {
				Pages.utils.footer.clear();

				const button = document.querySelector(`footer > button#${name}`);

				if (button) {
					button.classList.add("selected");
				}
			}
		}
	}
}

addEventListener("DOMContentLoaded",() => {
	window.currentChannel = new URLSearchParams(location.search).get("channel") || 0;

	youtube.request("/channels?maxResults=1&mine=true&part=snippet&fields=items(snippet(thumbnails(default(url)),country))")
	.then((response) => {
		window.channels = response.datas.items;
		document.querySelector("header > div.profile > img.logo").src = channels && channels.length > currentChannel && channels[currentChannel]?.snippet?.thumbnails?.default?.url ? channels[currentChannel].snippet.thumbnails.default.url : "../../assets/user.svg";
		
		const footerButtons = document.querySelectorAll("footer > button");
		for (let x = 0; x < footerButtons.length; ++x) {
			footerButtons[x].addEventListener("click",() => {
				if (!footerButtons[x].classList.contains("selected")) {
					Pages.set(footerButtons[x].id);
				}
			});
		}

		document.querySelector("header > input#search").addEventListener("search",(e) => {
			Pages.set("video",e.target.value);
		});

		Pages.set();
	}).catch((e) => Pages.utils.error("Failed to fetch user's datas",e));
});