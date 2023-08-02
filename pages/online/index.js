const actx = new AudioContext();

const Pages = {
	set: (page = "home", ...args) => {
		Pages.utils.clear();
		Pages.utils.set(page);
		Pages.utils.footer.set(page);
		(Pages.list[page] || (() => Pages.utils.error("Page not found", page)))(...args);
	},

	list: {
		video: (id, downloaded = false) => {
			(downloaded ? downloads.info(id) : youtube.info(id, channels && channels.length > currentChannel ? channels[currentChannel]?.snippet?.country : null))
				.then((datas) => {
					discord.rpc({
						details: `Watching videos`,
						state: `${datas.videoDetails.author.name} - ${datas.videoDetails.title}`
					});

					if (downloaded) Pages.list.video(id);
					else {
						if (datas === "Expired") Pages.list.video(id);
						else {
							const formats = {};
							for (let format of datas.formats) {
								const id = format.hasVideo ? `${Math.min(format.width, format.height)}p${format.fps}` : "Audio";
								if (!formats[id] && (format.container === "mp4" || format.container === "webm") && format.projectionType === "RECTANGULAR" && !format.isLive) {
									let bitrate = format.averageBitrate / 8;

									switch (true) {
										case bitrate > 10 ** 6:
											bitrate /= 10 ** 6;

											if (bitrate > 10) bitrate = bitrate.toFixed(0)
											else bitrate = bitrate.toFixed(1)

											bitrate += " MB/s"
											break;

										case bitrate > 10 ** 3:
											bitrate /= 10 ** 3;

											if (bitrate > 10) bitrate = bitrate.toFixed(0)
											else bitrate = bitrate.toFixed(1)

											bitrate += " KB/s"
											break;

										default:
											bitrate = Math.round(bitrate);
											bitrate += " B/s"
											break;
									}

									formats[id] = {
										bitrate,
										container: format.container,
										duration: format.approxDurationMs / 1000,
										fps: format.fps,
										height: Math.round(format.width * 9 / 16),
										id,
										hasAudio: format.hasAudio,
										hasVideo: format.hasVideo,
										intBitrate: format.averageBitrate / 8,
										size: Number(format.contentLength),
										type: format.mimeType,
										url: format.url,
										width: format.width
									};
								}
							}

							formats.list = Object.values(formats);
							formats.videoList = formats.list.filter((format) => format.hasVideo);
							formats.videoList.sort((a, b) => (a.height == b.height ? (a.width == b.width ? (a.fps == b.fps ? a.hasAudio && !b.hasAudio : a.fps > b.fps) : a.width > b.width) : a.height > b.height) ? -1 : 1);

							window.player = document.createElement("div");
							player.threadId = 0;
							player.load = (format) => {
								const previousTime = videoElement.currentTime;
								const wasPlaying = !videoElement.paused;

								if (wasPlaying) videoElement.pause();

								for (let x = 0; x < settingsWindow.children.length; ++x) settingsWindow.children[x].classList.remove("selected");

								if (player.mediaSource instanceof MediaSource) for (const sourceBuffer of player.mediaSource.sourceBuffers) {
									if (sourceBuffer.updating) sourceBuffer.abort();
									if (sourceBuffer.duration > 0) sourceBuffer.remove(0, player.mediaSource.duration);
									player.mediaSource.removeSourceBuffer(sourceBuffer);
								}

								player.mediaSource = new MediaSource();
								videoElement.src = URL.createObjectURL(player.mediaSource);
								player.mediaSource.addEventListener("sourceopen", () => {
									videoElement.currentTime = previousTime;
									if (wasPlaying) videoElement.play();

									const threadId = ++player.threadId;
									player.sourceBuffer = player.mediaSource.addSourceBuffer(format.type);

									const xhr = new XMLHttpRequest();
									xhr.open("GET", format.url, true);
									xhr.responseType = "arraybuffer";
									xhr.setRequestHeader("Range", "bytes=0-1");
									xhr.addEventListener("load", () => {
										settingsWindow.querySelector(`#settings-${format.id}`).classList.add("selected");

										const length = Number(xhr.getResponseHeader("Content-Range").split("/")[1]);

										let cache = {};

										const loadChunk = (start, end) => new Promise(async (resolve, reject) => {
											if (!cache[`${start}-${end}`]) {
												cache[`${start}-${end}`] = await new Promise((resolve, reject) => {
													const xhr = new XMLHttpRequest();

													xhr.open("GET", format.url, true);
													xhr.responseType = "arraybuffer";
													xhr.timeout = 10000;
													xhr.setRequestHeader("Range", `bytes=${start}-${end}`);

													xhr.addEventListener("error", () => reject("Network error"));
													xhr.addEventListener("load", () => {
														if (xhr.status == 206) {
															resolve(xhr.response);
														} else if (xhr.status == 416) {
															console.error(`${start}-${end}/${length}`);
														} else {
															console.error(xhr.status);
														}
													});
													xhr.addEventListener("timeout", () => reject("Timeout"));

													xhr.send();
												}).catch(reject);
											}

											player.sourceBuffer.addEventListener("abort", () => reject("Aborted"), { once: true });
											player.sourceBuffer.addEventListener("error", () => reject("Failed"), { once: true });
											player.sourceBuffer.addEventListener("update", resolve, { once: true });

											if (player.sourceBuffer.updating) reject("Updating");
											else if (player.threadId != threadId) reject("New thread has spawned");
											else if (cache[`${start}-${end}`] == null) reject("Datas not loaded yet");
											else {
												try {
													player.sourceBuffer.appendBuffer(cache[`${start}-${end}`]);
												} catch {
													reject();
												}
											}
										});

										const chunkSize = 2 ** 23;
										let loadedChunks = {};

										const update = async () => {
											let start = Math.max(0, Math.floor((videoElement.currentTime - 1) * format.intBitrate / chunkSize) * chunkSize);
											let end = start + chunkSize;

											const formatted = {
												format: (n) => {
													switch (true) {
														case n > 10 ** 9:
															n /= 10 ** 9;

															if (n > 10) n = n.toFixed(0)
															else n = n.toFixed(1)

															n += " GB"
															break;

														case n > 10 ** 6:
															n /= 10 ** 6;

															if (n > 10) n = n.toFixed(0)
															else n = n.toFixed(1)

															n += " MB"
															break;

														case n > 10 ** 3:
															n /= 10 ** 3;

															if (n > 10) n = n.toFixed(0)
															else n = n.toFixed(1)

															n += " KB"
															break;

														default:
															n = Math.round(n);
															n += " B"
															break;
													}

													return n;
												},
												get start() {
													return formatted.format(start);
												},
												get end() {
													return formatted.format(end);
												}
											};

											try {
												let loop = true;
												while (loop) {
													if (player.sourceBuffer.updating) await new Promise((resolve) => player.sourceBuffer.addEventListener("updateend", resolve, { once: true }));
													const key = Object.keys(loadedChunks).sort((a, b) => a[0] - b[0])[0];
													if (key && loadedChunks[key] && loadedChunks[key][1] < start) {
														console.log((videoElement.currentTime - loadedChunks[key][1] / format.intBitrate).toFixed(1));
														player.sourceBuffer.remove(0, loadedChunks[key][1] / format.intBitrate);
														delete loadedChunks[key];
														console.info(`- ${key}`);
													} else loop = false;
												}
											} catch { }

											try {
												let loop = player.threadId == threadId;
												while (loop) {
													const id = `${formatted.start} -> ${formatted.end}`;

													if (Object.keys(loadedChunks).indexOf(id) == -1) {
														await loadChunk(start, end - 1);
														loadedChunks[id] = [start, end];
														console.info(`+ ${id}`);
														loop = false
													} else {
														start = end;
														end += chunkSize;
														end = Math.min(length, end);

														if (start >= length) {
															loop = false;
														}
													}
												}
											} catch (e) {
												if (e) console.error(`x ${formatted.start} -> ${formatted.end}:`, e);
											}

											if (player.threadId == threadId) requestAnimationFrame(update);
											else {
												for (let key in loadedChunks) console.log(`- ${key}`);
												loadedChunks = {};
												console.info("New thread spawned");
											}
										};

										update();
									});
									xhr.send();
								}, { once: true });
							};

							const audioElement = document.createElement("audio");
							const videoElement = document.createElement("video");
							const controls = document.createElement("div");
							const loader = document.createElement("div");
							const statusButton = document.createElement("button");
							const currentTime = document.createElement("div");
							const settingsButton = document.createElement("button");
							const settingsWindow = document.createElement("div");
							const pipButton = document.createElement("button");
							const downloadButton = document.createElement("button");
							const downloadWindow = document.createElement("div");
							const fullscreenButton = document.createElement("button");
							const timeline = document.createElement("div");
							const timelineCursor = document.createElement("div");
							const loadedTimeline = document.createElement("div");
							const info = document.createElement("div");

							player.classList.add("player");
							controls.classList.add("controls");
							loader.classList.add("loader");
							statusButton.classList.add("status");
							currentTime.classList.add("currentTime");
							settingsButton.classList.add("settings");
							settingsWindow.classList.add("settings", "window");
							pipButton.classList.add("pip");
							downloadButton.classList.add("download");
							downloadWindow.classList.add("download", "window");
							fullscreenButton.classList.add("fullscreen");
							timeline.classList.add("timeline");
							timelineCursor.classList.add("timelineCursor");
							loadedTimeline.classList.add("loadedTimeline");
							info.classList.add("info");

							const credits = "<!--! Font Awesome Free 6.4.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2023 Fonticons, Inc. -->";

							loader.innerHTML = `${credits}<svg xmlns="http://www.w3.org/2000/svg" class="icon" viewBox="0 0 512 512"><path d="M288 32c0-17.7-14.3-32-32-32s-32 14.3-32 32V96c0 17.7 14.3 32 32 32s32-14.3 32-32V32zm0 384c0-17.7-14.3-32-32-32s-32 14.3-32 32v64c0 17.7 14.3 32 32 32s32-14.3 32-32V416zM0 256c0 17.7 14.3 32 32 32H96c17.7 0 32-14.3 32-32s-14.3-32-32-32H32c-17.7 0-32 14.3-32 32zm416-32c-17.7 0-32 14.3-32 32s14.3 32 32 32h64c17.7 0 32-14.3 32-32s-14.3-32-32-32H416zM75 75c-12.5 12.5-12.5 32.8 0 45.3l45.3 45.3c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L120.2 75C107.7 62.5 87.5 62.5 75 75zM391.8 346.5c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L391.8 437c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3l-45.3-45.3zM75 437c12.5 12.5 32.8 12.5 45.3 0l45.3-45.3c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L75 391.8c-12.5 12.5-12.5 32.8 0 45.3zM346.5 120.2c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L437 120.2c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0l-45.3 45.3z"/></svg>`;

							statusButton.innerHTML = `<div class="off">${credits}<svg xmlns="http://www.w3.org/2000/svg" class="icon" viewBox="0 0 384 512"><path d="M73 39c-14.8-9.1-33.4-9.4-48.5-.9S0 62.6 0 80V432c0 17.4 9.4 33.4 24.5 41.9s33.7 8.1 48.5-.9L361 297c14.3-8.7 23-24.2 23-41s-8.7-32.2-23-41L73 39z"/></svg></div><div class="on">${credits}<svg xmlns="http://www.w3.org/2000/svg" class="icon" viewBox="0 0 320 512"><path d="M48 64C21.5 64 0 85.5 0 112V400c0 26.5 21.5 48 48 48H80c26.5 0 48-21.5 48-48V112c0-26.5-21.5-48-48-48H48zm192 0c-26.5 0-48 21.5-48 48V400c0 26.5 21.5 48 48 48h32c26.5 0 48-21.5 48-48V112c0-26.5-21.5-48-48-48H240z"/></svg></div>`;

							currentTime.innerHTML = `00<span class="separator">:</span>00`;

							settingsButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="icon" viewBox="0 0 512 512"><path d="M256 160a96 96 0 1 0 0 192 96 96 0 1 0 0-192zm48 96a48 48 0 1 1 -96 0 48 48 0 1 1 96 0zM234.9 0c-22.2 0-41.5 15.2-46.7 36.7L180 71l-1.1 .4L148.9 53c-18.9-11.6-43.3-8.7-59 7L60.1 89.9c-15.7 15.7-18.6 40.1-7 59l18.4 30L71 180l-34.2 8.3C15.2 193.4 0 212.7 0 234.9v42.2c0 22.2 15.2 41.5 36.7 46.7L71 332l.4 1.1L53 363.1c-11.6 18.9-8.7 43.3 7 59l29.8 29.8c15.7 15.7 40.1 18.6 59 7l30-18.4 1.1 .4 8.3 34.2c5.2 21.6 24.5 36.7 46.7 36.7h42.2c22.2 0 41.5-15.2 46.7-36.7L332 441l1.1-.4 30 18.4c18.9 11.6 43.3 8.7 59-7l29.8-29.8c15.7-15.7 18.6-40.1 7-59l-18.4-30 .4-1.1 34.2-8.3c21.6-5.2 36.7-24.5 36.7-46.7V234.9c0-22.2-15.2-41.5-36.7-46.7L441 180l-.4-1.1 18.4-30c11.6-18.9 8.7-43.3-7-59L422.1 60.1c-15.7-15.7-40.1-18.6-59-7l-30 18.4L332 71l-8.3-34.2C318.6 15.2 299.3 0 277.1 0H234.9zm0 48l42.2 0 11.3 46.6c1.9 8 7.9 14.5 15.7 17.1c6.8 2.3 13.5 5 19.9 8.2c7.4 3.7 16.2 3.3 23.3-1l40.9-25L418 123.8l-25 40.9c-4.3 7.1-4.7 15.9-1 23.3c3.2 6.4 6 13 8.2 19.9c2.6 7.9 9.1 13.8 17.1 15.7L464 234.9v42.2l-46.6 11.3c-8 1.9-14.5 7.9-17.1 15.7c-2.3 6.8-5 13.5-8.2 19.9c-3.7 7.4-3.3 16.2 1 23.3l25 40.9L388.2 418l-40.9-25c-7.1-4.3-15.9-4.7-23.3-1c-6.4 3.2-13 6-19.9 8.2c-7.9 2.6-13.8 9.1-15.7 17.1L277.1 464H234.9l-11.3-46.6c-1.9-8-7.9-14.5-15.7-17.1c-6.8-2.3-13.5-5-19.9-8.2c-7.4-3.7-16.2-3.3-23.3 1l-40.9 25L94 388.2l25-40.9c4.3-7.1 4.7-15.9 1-23.3c-3.2-6.4-6-13-8.2-19.9c-2.6-7.9-9.1-13.8-17.1-15.7L48 277.1l0-42.2 46.6-11.3c8-1.9 14.5-7.9 17.1-15.7c2.3-6.8 5-13.5 8.2-19.9c3.7-7.4 3.3-16.2-1-23.3L94 123.8 123.8 94l40.9 25c7.1 4.3 15.9 4.7 23.3 1c6.4-3.2 13-6 19.9-8.2c7.9-2.6 13.8-9.1 15.7-17.1L234.9 48z"/></svg>`;
							for (const format of formats.videoList) {
								format.element = document.createElement("div");
								format.element.classList.add("format");
								format.element.id = `settings-${format.id}`;

								format.element.innerHTML = `<div class="selected-icon">${credits}<svg xmlns="http://www.w3.org/2000/svg" class="icon" viewBox="0 0 448 512"><path d="M438.6 105.4c12.5 12.5 12.5 32.8 0 45.3l-256 256c-12.5 12.5-32.8 12.5-45.3 0l-128-128c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0L160 338.7 393.4 105.4c12.5-12.5 32.8-12.5 45.3 0z"/></svg></div>
									<div class="quality"><div class="height">${format.height}</div><div class="separator">p</div><div class="fps">${format.fps}</div></div><div class="bitrate">${format.bitrate}</div><div class="container">${format.container}</div>`;

								format.element.addEventListener("click", () => player.load(format));

								settingsWindow.append(format.element);
							}

							pipButton.innerHTML = `<div class="off">${credits}<svg xmlns="http://www.w3.org/2000/svg" class="icon" viewBox="0 0 512 512"><path d="M320 0c-17.7 0-32 14.3-32 32s14.3 32 32 32h82.7L201.4 265.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L448 109.3V192c0 17.7 14.3 32 32 32s32-14.3 32-32V32c0-17.7-14.3-32-32-32H320zM80 32C35.8 32 0 67.8 0 112V432c0 44.2 35.8 80 80 80H400c44.2 0 80-35.8 80-80V320c0-17.7-14.3-32-32-32s-32 14.3-32 32V432c0 8.8-7.2 16-16 16H80c-8.8 0-16-7.2-16-16V112c0-8.8 7.2-16 16-16H192c17.7 0 32-14.3 32-32s-14.3-32-32-32H80z"/></svg></div><div class="on">${credits}<svg xmlns="http://www.w3.org/2000/svg" class="icon" viewBox="0 0 640 512"><path d="M0 112C0 67.8 35.8 32 80 32c37.3 0 74.7 0 112 0c17.7 0 32 14.3 32 32s-14.3 32-32 32c-37.3 0-74.7 0-112 0c-8.8 0-16 7.2-16 16c0 106.7 0 213.3 0 320c0 8.8 7.2 16 16 16c86.4 0 172.8 0 259.2 0c13.1 25.6 32.3 47.5 55.6 64C289.9 512 185 512 80 512c-44.2 0-80-35.8-80-80C0 325.3 0 218.7 0 112zM201.4 265.4L402.7 64c-27.6 0-55.1 0-82.7 0c-17.7 0-32-14.3-32-32s14.3-32 32-32c53.3 0 106.7 0 160 0c17.7 0 32 14.3 32 32c0 53.3 0 106.7 0 160c0 .2 0 .5 0 .7c-5.3-.5-10.6-.7-16-.7c-16.4 0-32.3 2.2-47.4 6.4c-.4-2.1-.6-4.2-.6-6.4c0-27.6 0-55.1 0-82.7c-67.1 67.1-134.2 134.3-201.3 201.4c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3zM352 368c0-79.5 64.5-144 144-144s144 64.5 144 144s-64.5 144-144 144s-144-64.5-144-144zm84.7-59.3c-6.2 6.2-6.2 16.4 0 22.6c12.2 12.2 24.5 24.5 36.7 36.7c-12.2 12.2-24.5 24.5-36.7 36.7c-6.2 6.2-6.2 16.4 0 22.6s16.4 6.2 22.6 0c12.2-12.2 24.5-24.5 36.7-36.7c12.2 12.2 24.5 24.5 36.7 36.7c6.2 6.2 16.4 6.2 22.6 0s6.2-16.4 0-22.6c-12.2-12.2-24.5-24.5-36.7-36.7c12.2-12.2 24.5-24.5 36.7-36.7c6.2-6.2 6.2-16.4 0-22.6s-16.4-6.2-22.6 0c-12.2 12.2-24.5 24.5-36.7 36.7c-12.2-12.2-24.5-24.5-36.7-36.7c-6.2-6.2-16.4-6.2-22.6 0z"/></svg></div>`;

							downloadButton.innerHTML = `<div class="off">${credits}<svg xmlns="http://www.w3.org/2000/svg" class="icon" viewBox="0 0 384 512"><path d="M342.1 249.9L219.3 372.7c-7.2 7.2-17.1 11.3-27.3 11.3s-20.1-4.1-27.3-11.3L41.9 249.9c-6.4-6.4-9.9-15-9.9-24C32 207.2 47.2 192 65.9 192l62.1 0 0-128c0-17.7 14.3-32 32-32h64c17.7 0 32 14.3 32 32V192l62.1 0c18.7 0 33.9 15.2 33.9 33.9c0 9-3.6 17.6-9.9 24zM32 416H352c17.7 0 32 14.3 32 32s-14.3 32-32 32H32c-17.7 0-32-14.3-32-32s14.3-32 32-32z"/></svg></div><div class="on">${credits}<svg xmlns="http://www.w3.org/2000/svg" class="icon" viewBox="0 0 512 512"><path d="M288 32c0-17.7-14.3-32-32-32s-32 14.3-32 32V96c0 17.7 14.3 32 32 32s32-14.3 32-32V32zm0 384c0-17.7-14.3-32-32-32s-32 14.3-32 32v64c0 17.7 14.3 32 32 32s32-14.3 32-32V416zM0 256c0 17.7 14.3 32 32 32H96c17.7 0 32-14.3 32-32s-14.3-32-32-32H32c-17.7 0-32 14.3-32 32zm416-32c-17.7 0-32 14.3-32 32s14.3 32 32 32h64c17.7 0 32-14.3 32-32s-14.3-32-32-32H416zM75 75c-12.5 12.5-12.5 32.8 0 45.3l45.3 45.3c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L120.2 75C107.7 62.5 87.5 62.5 75 75zM391.8 346.5c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L391.8 437c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3l-45.3-45.3zM75 437c12.5 12.5 32.8 12.5 45.3 0l45.3-45.3c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L75 391.8c-12.5 12.5-12.5 32.8 0 45.3zM346.5 120.2c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L437 120.2c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0l-45.3 45.3z"/></svg></div>`;
							for (const format of formats.videoList) {
								format.element = document.createElement("div");
								format.element.classList.add("format");
								format.element.id = `download-${format.id}`;

								format.element.innerHTML = `<div class="quality"><div class="height">${format.height}</div><div class="separator">p</div><div class="fps">${format.fps}</div></div><div class="bitrate">${format.bitrate}</div><div class="container">${format.container}</div>`;

								format.element.addEventListener("click", () => {
									downloadWindow.classList.remove("visible");
									downloadButton.classList.add("enabled");

									youtube.download({
										audio: {
											container: formats["Audio"].container,
											url: formats["Audio"].url
										},
										video: {
											container: format.container,
											url: format.url
										},
										cover: datas.videoDetails.thumbnails[datas.videoDetails.thumbnails.length - 1].url,

										title: datas.videoDetails.title,
										channel: datas.videoDetails.author.name,
										publishDate: datas.videoDetails.publishDate,

										duration: format.duration,

										id,
										format: format.id,
										quality: {
											fps: format.fps,
											height: format.height
										}
									})
										.finally(() => {
											downloadButton.classList.remove("enabled");
										});
								});

								downloadWindow.append(format.element);
							}

							fullscreenButton.innerHTML = `<div class="off"><!--! Font Awesome Pro 6.4.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2023 Fonticons, Inc. --><svg xmlns="http://www.w3.org/2000/svg" class="icon" viewBox="0 0 512 512"><path d="M136 64c13.3 0 24 10.7 24 24s-10.7 24-24 24H48v88c0 13.3-10.7 24-24 24s-24-10.7-24-24V88C0 74.7 10.7 64 24 64H136zM0 312c0-13.3 10.7-24 24-24s24 10.7 24 24v88h88c13.3 0 24 10.7 24 24s-10.7 24-24 24H24c-13.3 0-24-10.7-24-24V312zM488 64c13.3 0 24 10.7 24 24V200c0 13.3-10.7 24-24 24s-24-10.7-24-24V112H376c-13.3 0-24-10.7-24-24s10.7-24 24-24H488zM464 312c0-13.3 10.7-24 24-24s24 10.7 24 24V424c0 13.3-10.7 24-24 24H376c-13.3 0-24-10.7-24-24s10.7-24 24-24h88V312z"/></svg></div><div class="on"><!--! Font Awesome Pro 6.4.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2023 Fonticons, Inc. --><svg xmlns="http://www.w3.org/2000/svg" class="icon" viewBox="0 0 512 512"><path d="M160 88c0-13.3-10.7-24-24-24s-24 10.7-24 24v88H24c-13.3 0-24 10.7-24 24s10.7 24 24 24H136c13.3 0 24-10.7 24-24V88zM24 288c-13.3 0-24 10.7-24 24s10.7 24 24 24h88v88c0 13.3 10.7 24 24 24s24-10.7 24-24V312c0-13.3-10.7-24-24-24H24zM400 88c0-13.3-10.7-24-24-24s-24 10.7-24 24V200c0 13.3 10.7 24 24 24H488c13.3 0 24-10.7 24-24s-10.7-24-24-24H400V88zM376 288c-13.3 0-24 10.7-24 24V424c0 13.3 10.7 24 24 24s24-10.7 24-24V336h88c13.3 0 24-10.7 24-24s-10.7-24-24-24H376z"/></svg></div>`;

							const audioSource = actx.createMediaElementSource(audioElement);
							audioSource.connect(actx.destination);

							videoElement.muted = true;
							videoElement.poster = datas.videoDetails.thumbnails[datas.videoDetails.thumbnails.length - 1].url;

							audioElement.addEventListener("play", () => videoElement.play());
							audioElement.addEventListener("pause", () => videoElement.pause());
							audioElement.addEventListener("seeking", () => {
								videoElement.playbackRate = 0;
								loader.style.display = "";
							});
							audioElement.addEventListener("canplaythrough", () => {
								videoElement.playbackRate = 1;
								loader.style.display = "none";
							});

							videoElement.addEventListener("click", () => {
								if (player.currentWindow) player.currentWindow.classList.remove("visible");
							});
							videoElement.addEventListener("play", () => {
								audioElement.play();
								statusButton.classList.add("enabled")
							});
							videoElement.addEventListener("pause", () => {
								audioElement.pause();
								statusButton.classList.remove("enabled")
							});
							videoElement.addEventListener("seeking", () => {
								audioElement.playbackRate = 0;
								loader.style.display = "";
							});
							videoElement.addEventListener("canplaythrough", () => {
								audioElement.playbackRate = 1;
								loader.style.display = "none";
							});
							videoElement.addEventListener("error", () => {
								controls.style.display = "grid";
								videoElement.innerHTML = `<p><b>This video is unavailable</b></p><p>This may due to:<ul><li>Your network connection</li><li>Your device that doesn't support this quality</li><li>A server error from YouTube</li></ul></p><p>Check your internet connection, try to choose a lower quality, restart the app or try to download the video with mp4.</p>`;
							});

							const update = () => {
								if (Math.sqrt(Math.pow(audioElement.currentTime - videoElement.currentTime, 2)) > 0.1) audioElement.currentTime = videoElement.currentTime;

								const playerComputedStyle = getComputedStyle(player);
								const videoComputedStyle = getComputedStyle(videoElement);

								controls.style.top = `calc((${playerComputedStyle.height} - ${videoComputedStyle.height}) / 2)`;
								controls.style.left = playerComputedStyle.marginLeft;
								controls.style.width = videoComputedStyle.width;
								controls.style.height = videoComputedStyle.height;

								currentTime.innerHTML = `${videoElement.currentTime > 3600 ? `${Math.floor(videoElement.currentTime / 3600)}<span class="separator">:</span>` : ""}${("0" + Math.floor(videoElement.currentTime / 60 % 60)).slice(-2)}<span class="separator">:</span>${("0" + Math.floor(videoElement.currentTime % 60)).slice(-2)}`;

								timelineCursor.style.width = `${videoElement.currentTime / videoElement.duration * 100}%`;

								if (videoElement.buffered.length > 0) {
									loadedTimeline.style.left = getComputedStyle(timelineCursor).width;

									const loaded = player.sourceBuffer.buffered.end(player.sourceBuffer.buffered.length - 1);
									loadedTimeline.style.width = `calc(${getComputedStyle(timeline).width} * ${(loaded - videoElement.currentTime) / videoElement.duration})`;
								} else {
									loadedTimeline.style.left = 0;
									loadedTimeline.style.width = 0;
								}

								requestAnimationFrame(update);
							};

							update();

							controls.addEventListener("mousenter", () => controls.classList.add("visible"));
							controls.addEventListener("mousemove", () => {
								if (controls.previousTimeout) clearTimeout(controls.previousTimeout);
								controls.classList.add("visible");
								controls.previousTimeout = setTimeout(() => {
									if (videoElement.played) controls.classList.remove("visible");
								}, 2000);
							});
							controls.addEventListener("mouseout", () => controls.classList.remove("visible"));
							controls.addEventListener("mouseleave", () => controls.classList.remove("visible"));
							controls.addEventListener("pause", () => controls.classList.add("visible"));
							controls.addEventListener("click", () => {
								if (player.currentWindow) player.currentWindow.classList.remove("visible");
							});

							statusButton.addEventListener("click", () => {
								if (player.currentWindow) player.currentWindow.classList.remove("visible");
								audioElement.paused ? audioElement.play() : audioElement.pause();
							});

							settingsButton.addEventListener("click", (e) => {
								if (settingsWindow.classList.toggle("visible")) {
									if (player.currentWindow && player.currentWindow !== settingsWindow) player.currentWindow.classList.remove("visible");
									player.currentWindow = settingsWindow;
								} else player.currentWindow = null;
								e.stopPropagation();
							});

							pipButton.addEventListener("click", () => {
								if (player.currentWindow) player.currentWindow.classList.remove("visible");
								document.pictureInPictureElement instanceof Element ? document.exitPictureInPicture() : videoElement.requestPictureInPicture();
							});
							document.addEventListener("enterpictureinpicture", () => pipButton.classList.add("enabled"));
							document.addEventListener("leavepictureinpicture", () => pipButton.classList.remove("enabled"));

							downloadButton.addEventListener("click", (e) => {
								if (!downloadButton.classList.contains("enabled")) {
									if (downloadWindow.classList.toggle("visible")) {
										if (player.currentWindow && player.currentWindow !== downloadWindow) player.currentWindow.classList.remove("visible");
										player.currentWindow = downloadWindow;
									} else player.currentWindow = null;
									e.stopPropagation();
								}
							});

							fullscreenButton.addEventListener("click", () => {
								if (player.currentWindow) player.currentWindow.classList.remove("visible");
								document.fullscreenElement instanceof Element ? document.exitFullscreen() : player.requestFullscreen({ navigationUI: "hide" });
							});
							document.addEventListener("fullscreenchange", () => fullscreenButton.classList.toggle("enabled", document.fullscreenElement instanceof Element));

							videoElement.append(audioElement);
							timeline.append(timelineCursor, loadedTimeline);
							controls.append(loader, statusButton, currentTime, settingsButton, settingsWindow, downloadButton, downloadWindow, timeline);
							if (document.pictureInPictureEnabled) controls.append(pipButton);
							if (document.fullscreenEnabled) controls.append(fullscreenButton);
							player.append(videoElement, controls);
							document.querySelector("div.main").append(player, info);

							audioElement.type = `audio/${formats["Audio"].container}`;
							audioElement.src = formats["Audio"].url;
							player.load(formats.videoList[0]);
						}
					}
				}).catch((e) => Pages.utils.error(`Failed to fetch info of <i>${id}</i>`, e));
		}
	},

	utils: {
		clear: () => document.querySelector("div.main").innerHTML = "",
		set: (page) => document.querySelector("div.main").setAttribute("page", page),
		error: (text, error) => {
			Pages.utils.clear();
			Pages.utils.set("error");
			document.querySelector("div.main").innerHTML = `<p><b>${text || "An unknown error occured"}</b><br /><code>${error || "No log found"}</code></p>`;
		},
		footer: {
			clear: () => {
				const buttons = document.querySelectorAll("footer > button.selected");
				for (let x = 0; x < buttons.length; ++x) buttons[x].classList.remove("selected");
			},

			set: (name = "home") => {
				Pages.utils.footer.clear();

				const button = document.querySelector(`footer > button#${name}`);
				if (button) button.classList.add("selected");
			}
		}
	}
}

addEventListener("DOMContentLoaded", () => {
	window.currentChannel = new URLSearchParams(location.search).get("channel") || 0;

	youtube.request("/channels?maxResults=1&mine=true&part=snippet&fields=items(snippet(thumbnails(default(url)),country))")
		.then(async (response) => {
			window.channels = response.datas.items;
			document.querySelector("header > div.profile > img.logo").src = channels && channels.length > currentChannel && channels[currentChannel]?.snippet?.thumbnails?.default?.url ? channels[currentChannel].snippet.thumbnails.default.url : "../../assets/user.svg";

			const footerButtons = document.querySelectorAll("footer > button");
			for (let x = 0; x < footerButtons.length; ++x) {
				footerButtons[x].addEventListener("click", () => {
					if (!footerButtons[x].classList.contains("selected")) Pages.set(footerButtons[x].id);
				});
			}

			document.querySelector("header > input#search").addEventListener("search", (e) => {
				const regexp = /[0-9A-z_\-./:]*(youtube\.com\/watch\?{0,}v=|youtu\.be\/)([0-9A-z_-]*)[0-9A-z_\-./:&=]*/g;

				if (regexp.test(e.target.value)) Pages.set("video", e.target.value.replace(regexp, "$2"));
				else Pages.set("search", e.target.value);
			});

			if (await isDev()) Pages.set("video", "B0YlktE79CM");
			else Pages.set();
		}).catch((e) => Pages.utils.error("Failed to fetch user's datas", e));
});