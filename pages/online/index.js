const actx = new AudioContext();

const Pages = {
	set: (page="home",...args) => {
		Pages.utils.clear();
		Pages.utils.set(page);
		Pages.utils.footer.set(page);
		(Pages.list[page] || (() => Pages.utils.error("Page not found",page)))(...args);
	},

	list: {
		downloads: () => {
			discord.rpc({
				details: "Scrolling on downloads page"
			});
		},
		home: () => {
			discord.rpc({
				details: "Scrolling on homepage"
			});

			youtube.request(`/videos?chart=mostPopular${channels && channels.length > currentChannel && channels[currentChannel]?.snippet?.country ? "&regionCode=" + channels[currentChannel].snippet.country : ""}&maxResults=50&fields=items(id)`)
			.then((videos) => {
				for (let video of videos.datas.items) {
					const append = (html="") => {
						const videoEl = document.createElement("div");
						videoEl.classList.add("video");
						videoEl.id = video.id;
						videoEl.addEventListener("click",() => Pages.set("video",video.id));
						videoEl.innerHTML = html;
						document.querySelector("div.main").append(videoEl);
					};

					const displayInfos = () => {
						youtube.info(video.id,channels && channels.length > currentChannel ? channels[currentChannel]?.snippet?.country : null)
						.then((datas) => {
							if (datas === "Expired") {
								displayInfos();
							} else {
								append(`<div class="title">${datas.videoDetails.title}</div><img class="thumbnail" src="${datas.videoDetails.thumbnails[datas.videoDetails.thumbnails.length - 1].url}" /><div class="channel"><img class="logo" src="${datas.videoDetails.author.thumbnails[datas.videoDetails.author.thumbnails.length - 1].url}" /><div class="title">${datas.videoDetails.author.name}</div></div>`);
							}
						}).catch((e) => {
							append(`Failed to fetch info of <i>${video.id}</i>`);
							console.error(e);
						});
					};

					displayInfos();
				}
			}).catch((e) => Pages.utils.error("Failed to fetch homepage",e));
		},
		search: (query="") => {
			youtube.request(`/search?q=${encodeURIComponent(query)}&part=snippet${channels && channels.length > currentChannel && channels[currentChannel]?.snippet?.country ? "&regionCode=" + channels[currentChannel].snippet.country : ""}&type=channel,video&maxResults=50&fields=items(id,snippet(title,description,channelTitle,channelId,thumbnails(high(url),maxres(url))))`)
			.then(async (results) => {
				discord.rpc({
					details: "Searching"
				});

				for (let result of results.datas.items) {
					const append = (html="") => {
						const resultEl = document.createElement("div");
						resultEl.classList.add("result",{"youtube#channel": "channel","youtube#video": "video"}[result.id.kind]);
						resultEl.id = result.id.channelId || result.id.videoId || "unknow";
						resultEl.addEventListener("click",() => {
							switch (result.id.kind) {
								case "youtube#channel":
									Pages.set("channel",result.id.channelId);
									break;
								
								case "youtube#video":
									Pages.set("video",result.id.videoId);
									break;
							}
						});
						resultEl.innerHTML = html;
						document.querySelector("div.main").append(resultEl);
					};

					switch (result.id.kind) {
						case "youtube#channel":
							await new Promise((resolve) => {
								youtube.request(`/channels?id=${result.id.channelId}&part=snippet,statistics${channels && channels.length > currentChannel && channels[currentChannel]?.snippet?.country ? "&regionCode=" + channels[currentChannel].snippet.country : ""}&maxResults=1&fields=items(snippet(title,description,customUrl,thumbnails(high(url),maxres(url))),statistics(subscriberCount,hiddenSubscriberCount,videoCount))`)
								.then((channel) => {
									append(`<div class="title">${channel.datas.items[0].snippet.title}</div><div class="description">${channel.datas.items[0].snippet.description}</div><div class="statistics">${channel.datas.items[0].statistics.hiddenSubscriberCount ? "" : `<div class="subscribers">${channel.datas.items[0].statistics.subscriberCount} followers</div>`}<div class="videos">${channel.datas.items[0].statistics.videoCount} video${channel.datas.items[0].statistics.videoCount > 1 ? "s" : ""}</div></div><img class="thumbnail" src="${Object.values(channel.datas.items[0].snippet.thumbnails)[Object.values(channel.datas.items[0].snippet.thumbnails).length - 1].url}" />`);
									resolve();
								}).catch((e) => {
									append(`Failed to fetch info of channel <i>${result.id.channelId}</i>`);
									console.error(e);
									resolve();
								});
							});
							break;
						
						case "youtube#video":
							const displayInfos = () => new Promise(async (resolve) => {
								youtube.info(result.id.videoId,channels && channels.length > currentChannel ? channels[currentChannel]?.snippet?.country : null)
								.then(async (datas) => {
									if (datas === "Expired") {
										await displayInfos();
										resolve();
									} else {
										append(`<div class="title">${datas.videoDetails.title}</div><img class="thumbnail" src="${datas.videoDetails.thumbnails[datas.videoDetails.thumbnails.length - 1].url}" /><div class="channel"><img class="logo" src="${datas.videoDetails.author.thumbnails[datas.videoDetails.author.thumbnails.length - 1].url}" /><div class="title">${datas.videoDetails.author.name}</div></div>`);
										resolve();
									}
								}).catch((e) => {
									append(`Failed to fetch info of video <i>${result.id.videoId}</i>`);
									console.error(e);
									resolve();
								});
							});
		
							await displayInfos();
							break;
						
						default:
							append(`Failed to display: Unknow kind of result: ${result.id.kind}`);
							break;
					}
				}
			}).catch((e) => Pages.utils.error(`Failed to search <i>${query}</i>`,e));
		},
		video: (id,downloaded=false) => {
			(downloaded ? downloads.info(id) : youtube.info(id,channels && channels.length > currentChannel ? channels[currentChannel]?.snippet?.country : null))
			.then((datas) => {
				discord.rpc({
					details: `Watching videos`,
					state: `${datas.videoDetails.author.name} - ${datas.videoDetails.title}`
				});

				if (downloaded) {

				} else {
					if (datas === "Expired") {
						Pages.list.video(id);
					} else {
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
								
								downloadButton.addEventListener("click",() => youtube.download({
									audio: formats["Audio"].url,
									video: format.url,
									cover: datas.videoDetails.thumbnails[datas.videoDetails.thumbnails.length - 1].url,
	
									title: datas.videoDetails.title,
									channel: datas.videoDetails.author.name,
									publishDate: datas.videoDetails.publishDate,
	
									id: id,
									quality: format.id
								}));
	
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

									videoElement.addEventListener("seeking",() => audioElement.playbackRate = 0);
								});
							
								videoElement.addEventListener("seeked",async () => {
									if (audioElement.readyState < 3) {
										await new Promise((resolve) => audioElement.addEventListener("canplaythrough",resolve));
									}
									audioElement.playbackRate = 1;
								});

								const synchronize = () => {
									if (Math.sqrt(Math.pow(audioElement.currentTime - videoElement.currentTime,2)) > 0.1) {
										videoElement.currentTime = audioElement.currentTime;
									}
								};
	
								audioElement.addEventListener("timeupdate",synchronize);
								videoElement.addEventListener("timeupdate",() => {
									cursor.style.width = `${videoElement.currentTime / videoElement.duration * 100}%`;
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
						const progressBar = document.createElement("div");
						const cursor = document.createElement("div");
						const info = document.createElement("div");
						const author = document.createElement("div");
						const downloadButton = document.createElement("button");
						
						statusButton.innerHTML = `<div class="off"><!--! Font Awesome Free 6.4.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2023 Fonticons, Inc. --><svg xmlns="http://www.w3.org/2000/svg" class="icon" viewBox="0 0 384 512"><path d="M73 39c-14.8-9.1-33.4-9.4-48.5-.9S0 62.6 0 80V432c0 17.4 9.4 33.4 24.5 41.9s33.7 8.1 48.5-.9L361 297c14.3-8.7 23-24.2 23-41s-8.7-32.2-23-41L73 39z"/></svg></div>
						                          <div class="on"><!--! Font Awesome Free 6.4.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2023 Fonticons, Inc. --><svg xmlns="http://www.w3.org/2000/svg" class="icon" viewBox="0 0 320 512"><path d="M48 64C21.5 64 0 85.5 0 112V400c0 26.5 21.5 48 48 48H80c26.5 0 48-21.5 48-48V112c0-26.5-21.5-48-48-48H48zm192 0c-26.5 0-48 21.5-48 48V400c0 26.5 21.5 48 48 48h32c26.5 0 48-21.5 48-48V112c0-26.5-21.5-48-48-48H240z"/></svg></div>`;
						settingsButton.innerHTML = `<!--! Font Awesome Pro 6.4.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2023 Fonticons, Inc. --><svg xmlns="http://www.w3.org/2000/svg" class="icon" viewBox="0 0 512 512"><path d="M256 160a96 96 0 1 0 0 192 96 96 0 1 0 0-192zm48 96a48 48 0 1 1 -96 0 48 48 0 1 1 96 0zM234.9 0c-22.2 0-41.5 15.2-46.7 36.7L180 71l-1.1 .4L148.9 53c-18.9-11.6-43.3-8.7-59 7L60.1 89.9c-15.7 15.7-18.6 40.1-7 59l18.4 30L71 180l-34.2 8.3C15.2 193.4 0 212.7 0 234.9v42.2c0 22.2 15.2 41.5 36.7 46.7L71 332l.4 1.1L53 363.1c-11.6 18.9-8.7 43.3 7 59l29.8 29.8c15.7 15.7 40.1 18.6 59 7l30-18.4 1.1 .4 8.3 34.2c5.2 21.6 24.5 36.7 46.7 36.7h42.2c22.2 0 41.5-15.2 46.7-36.7L332 441l1.1-.4 30 18.4c18.9 11.6 43.3 8.7 59-7l29.8-29.8c15.7-15.7 18.6-40.1 7-59l-18.4-30 .4-1.1 34.2-8.3c21.6-5.2 36.7-24.5 36.7-46.7V234.9c0-22.2-15.2-41.5-36.7-46.7L441 180l-.4-1.1 18.4-30c11.6-18.9 8.7-43.3-7-59L422.1 60.1c-15.7-15.7-40.1-18.6-59-7l-30 18.4L332 71l-8.3-34.2C318.6 15.2 299.3 0 277.1 0H234.9zm0 48l42.2 0 11.3 46.6c1.9 8 7.9 14.5 15.7 17.1c6.8 2.3 13.5 5 19.9 8.2c7.4 3.7 16.2 3.3 23.3-1l40.9-25L418 123.8l-25 40.9c-4.3 7.1-4.7 15.9-1 23.3c3.2 6.4 6 13 8.2 19.9c2.6 7.9 9.1 13.8 17.1 15.7L464 234.9v42.2l-46.6 11.3c-8 1.9-14.5 7.9-17.1 15.7c-2.3 6.8-5 13.5-8.2 19.9c-3.7 7.4-3.3 16.2 1 23.3l25 40.9L388.2 418l-40.9-25c-7.1-4.3-15.9-4.7-23.3-1c-6.4 3.2-13 6-19.9 8.2c-7.9 2.6-13.8 9.1-15.7 17.1L277.1 464H234.9l-11.3-46.6c-1.9-8-7.9-14.5-15.7-17.1c-6.8-2.3-13.5-5-19.9-8.2c-7.4-3.7-16.2-3.3-23.3 1l-40.9 25L94 388.2l25-40.9c4.3-7.1 4.7-15.9 1-23.3c-3.2-6.4-6-13-8.2-19.9c-2.6-7.9-9.1-13.8-17.1-15.7L48 277.1l0-42.2 46.6-11.3c8-1.9 14.5-7.9 17.1-15.7c2.3-6.8 5-13.5 8.2-19.9c3.7-7.4 3.3-16.2-1-23.3L94 123.8 123.8 94l40.9 25c7.1 4.3 15.9 4.7 23.3 1c6.4-3.2 13-6 19.9-8.2c7.9-2.6 13.8-9.1 15.7-17.1L234.9 48z"/></svg>`;
						pipButton.innerHTML = `<div class="off"><!--! Font Awesome Free 6.4.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2023 Fonticons, Inc. --><svg xmlns="http://www.w3.org/2000/svg" class="icon" viewBox="0 0 512 512"><path d="M320 0c-17.7 0-32 14.3-32 32s14.3 32 32 32h82.7L201.4 265.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L448 109.3V192c0 17.7 14.3 32 32 32s32-14.3 32-32V32c0-17.7-14.3-32-32-32H320zM80 32C35.8 32 0 67.8 0 112V432c0 44.2 35.8 80 80 80H400c44.2 0 80-35.8 80-80V320c0-17.7-14.3-32-32-32s-32 14.3-32 32V432c0 8.8-7.2 16-16 16H80c-8.8 0-16-7.2-16-16V112c0-8.8 7.2-16 16-16H192c17.7 0 32-14.3 32-32s-14.3-32-32-32H80z"/></svg></div>
						                       <div class="on"><!--! Font Awesome Free 6.4.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2023 Fonticons, Inc. --><svg xmlns="http://www.w3.org/2000/svg" class="icon" viewBox="0 0 640 512"><path d="M0 112C0 67.8 35.8 32 80 32c37.3 0 74.7 0 112 0c17.7 0 32 14.3 32 32s-14.3 32-32 32c-37.3 0-74.7 0-112 0c-8.8 0-16 7.2-16 16c0 106.7 0 213.3 0 320c0 8.8 7.2 16 16 16c86.4 0 172.8 0 259.2 0c13.1 25.6 32.3 47.5 55.6 64C289.9 512 185 512 80 512c-44.2 0-80-35.8-80-80C0 325.3 0 218.7 0 112zM201.4 265.4L402.7 64c-27.6 0-55.1 0-82.7 0c-17.7 0-32-14.3-32-32s14.3-32 32-32c53.3 0 106.7 0 160 0c17.7 0 32 14.3 32 32c0 53.3 0 106.7 0 160c0 .2 0 .5 0 .7c-5.3-.5-10.6-.7-16-.7c-16.4 0-32.3 2.2-47.4 6.4c-.4-2.1-.6-4.2-.6-6.4c0-27.6 0-55.1 0-82.7c-67.1 67.1-134.2 134.3-201.3 201.4c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3zM352 368c0-79.5 64.5-144 144-144s144 64.5 144 144s-64.5 144-144 144s-144-64.5-144-144zm84.7-59.3c-6.2 6.2-6.2 16.4 0 22.6c12.2 12.2 24.5 24.5 36.7 36.7c-12.2 12.2-24.5 24.5-36.7 36.7c-6.2 6.2-6.2 16.4 0 22.6s16.4 6.2 22.6 0c12.2-12.2 24.5-24.5 36.7-36.7c12.2 12.2 24.5 24.5 36.7 36.7c6.2 6.2 16.4 6.2 22.6 0s6.2-16.4 0-22.6c-12.2-12.2-24.5-24.5-36.7-36.7c12.2-12.2 24.5-24.5 36.7-36.7c6.2-6.2 6.2-16.4 0-22.6s-16.4-6.2-22.6 0c-12.2 12.2-24.5 24.5-36.7 36.7c-12.2-12.2-24.5-24.5-36.7-36.7c-6.2-6.2-16.4-6.2-22.6 0z"/></svg></div>`;
						fullscreenButton.innerHTML = `<div class="off"><!--! Font Awesome Pro 6.4.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2023 Fonticons, Inc. --><svg xmlns="http://www.w3.org/2000/svg" class="icon" viewBox="0 0 512 512"><path d="M136 64c13.3 0 24 10.7 24 24s-10.7 24-24 24H48v88c0 13.3-10.7 24-24 24s-24-10.7-24-24V88C0 74.7 10.7 64 24 64H136zM0 312c0-13.3 10.7-24 24-24s24 10.7 24 24v88h88c13.3 0 24 10.7 24 24s-10.7 24-24 24H24c-13.3 0-24-10.7-24-24V312zM488 64c13.3 0 24 10.7 24 24V200c0 13.3-10.7 24-24 24s-24-10.7-24-24V112H376c-13.3 0-24-10.7-24-24s10.7-24 24-24H488zM464 312c0-13.3 10.7-24 24-24s24 10.7 24 24V424c0 13.3-10.7 24-24 24H376c-13.3 0-24-10.7-24-24s10.7-24 24-24h88V312z"/></svg></div>
						                              <div class="on"><!--! Font Awesome Pro 6.4.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2023 Fonticons, Inc. --><svg xmlns="http://www.w3.org/2000/svg" class="icon" viewBox="0 0 512 512"><path d="M160 88c0-13.3-10.7-24-24-24s-24 10.7-24 24v88H24c-13.3 0-24 10.7-24 24s10.7 24 24 24H136c13.3 0 24-10.7 24-24V88zM24 288c-13.3 0-24 10.7-24 24s10.7 24 24 24h88v88c0 13.3 10.7 24 24 24s24-10.7 24-24V312c0-13.3-10.7-24-24-24H24zM400 88c0-13.3-10.7-24-24-24s-24 10.7-24 24V200c0 13.3 10.7 24 24 24H488c13.3 0 24-10.7 24-24s-10.7-24-24-24H400V88zM376 288c-13.3 0-24 10.7-24 24V424c0 13.3 10.7 24 24 24s24-10.7 24-24V336h88c13.3 0 24-10.7 24-24s-10.7-24-24-24H376z"/></svg></div>`;
						downloadButton.innerHTML = `<!--! Font Awesome Pro 6.4.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2023 Fonticons, Inc. --><svg xmlns="http://www.w3.org/2000/svg" class="icon" viewBox="0 0 384 512"><path d="M342.1 249.9L219.3 372.7c-7.2 7.2-17.1 11.3-27.3 11.3s-20.1-4.1-27.3-11.3L41.9 249.9c-6.4-6.4-9.9-15-9.9-24C32 207.2 47.2 192 65.9 192l62.1 0 0-128c0-17.7 14.3-32 32-32h64c17.7 0 32 14.3 32 32V192l62.1 0c18.7 0 33.9 15.2 33.9 33.9c0 9-3.6 17.6-9.9 24zM32 416H352c17.7 0 32 14.3 32 32s-14.3 32-32 32H32c-17.7 0-32-14.3-32-32s14.3-32 32-32z"/></svg>`;

						videoElement.preload = "auto";
	
						player.classList.add("player");
						controls.classList.add("controls");
						statusButton.classList.add("status");
						settingsButton.classList.add("settings");
						pipButton.classList.add("pip");
						fullscreenButton.classList.add("fullscreen");
						progressBar.classList.add("bar");
						cursor.classList.add("cursor");
						info.classList.add("info");
						author.classList.add("author");
						downloadButton.classList.add("download");
	
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
						document.addEventListener("enterpictureinpicture",() => pipButton.classList.add("enabled"));
						document.addEventListener("leavepictureinpicture",() => pipButton.classList.remove("enabled"));
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
						progressBar.append(cursor);
						controls.append(statusButton,settingsButton,progressBar);
						if (document.pictureInPictureEnabled) controls.append(pipButton);
						if (document.fullscreenEnabled) controls.append(fullscreenButton);
						player.append(videoElement,controls,settingsPopup);
						info.append(author);
						document.querySelector("div.main").append(player,info,downloadButton);

						player.play(formats.videoList[0]);
					}
				}
			}).catch((e) => Pages.utils.error(`Failed to fetch info of <i>${id}</i>`,e));
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
			const regexp = /[0-9A-z_\-./:]*(youtube\.com\/watch\?{0,}v=|youtu\.be\/)([0-9A-z_-]*)[0-9A-z_\-./:&=]*/g;
			
			if (regexp.test(e.target.value)) {
				Pages.set("video",e.target.value.replace(regexp,"$2"));
			} else {
				Pages.set("search",e.target.value);
			}
		});

		Pages.set();
	}).catch((e) => Pages.utils.error("Failed to fetch user's datas",e));
});