const { spawn } = require("child_process");
const DiscordRPC = require("discord-rpc");
const dns = require("dns");
const { app, BrowserWindow, dialog, ipcMain, nativeTheme, Notification } = require("electron");
const fs = require("fs");
const https = require("https");
const ytdl = require("ytdl-core");

const config = require("./config.json");

app.startTimestamp = new Date();

const refreshToken = () => new Promise((resolve) => {
	dns.resolve4("wixonic.fr", async (error) => {
		if (!error) { // isOnline
			const window = new BrowserWindow({
				backgroundColor: nativeTheme.shouldUseDarkColors ? "#000" : "#FFF",
				minHeight: 400,
				minWidth: 400,
				title: "Connect to your Google Account"
			});

			window.webContents.on("will-redirect", async (e, url) => {
				if (url.startsWith(config.youtube.redirect_uri)) {
					e.preventDefault();
					window.destroy();

					const hash = new URLSearchParams(url.split("#")[1]);

					if (hash.get("access_token")) {
						fs.writeFileSync(`${app.getPath("appData")}/Youtube Download/token`, hash.get("access_token"), "utf-8");

						config.token = hash.get("access_token");
						resolve(config.token);
					} else {
						const result = await dialog.showMessageBox({
							buttons: ["Quit", "Retry"],
							cancelId: 0,
							defaultId: 1,
							detail: "Failed to authenticate with your Google Account.",
							message: "Connection failed",
							type: "warning"
						});

						switch (result) {
							case 0:
								app.quit();
								break;

							case 1:
								launch();
								break;
						}
					}
				}
			});

			window.loadURL(`https://accounts.google.com/o/oauth2/v2/auth?client_id=${config.youtube.client_id}&response_type=token&redirect_uri=${config.youtube.redirect_uri}&scope=${config.youtube.scopes.join(" ")}`);
		} else {
			const window = new BrowserWindow({
				backgroundColor: nativeTheme.shouldUseDarkColors ? "#000" : "#FFF",
				minHeight: 400,
				minWidth: 400,
				title: "YouTube Alt",
				webPreferences: {
					preload: `${__dirname}/pages/offline/preload.js`
				}
			});

			window.loadFile(`${__dirname}/pages/offline/index.html`);
		}
	});
});

const launch = () => {
	dns.resolve4("wixonic.fr", async (error) => {
		if (!error) { // isOnline
			if (!config.token) {
				config.token = await new Promise(async (resolve) => {
					if (fs.existsSync(`${app.getPath("appData")}/Youtube Download/token`)) resolve(fs.readFileSync(`${app.getPath("appData")}/Youtube Download/token`, "utf-8"));
					else {
						const window = new BrowserWindow({
							backgroundColor: nativeTheme.shouldUseDarkColors ? "#000" : "#FFF",
							minHeight: 400,
							minWidth: 400,
							title: "Connect to your Google Account"
						});

						window.webContents.on("will-redirect", async (e, url) => {
							if (url.startsWith(config.youtube.redirect_uri)) {
								e.preventDefault();
								window.destroy();

								const hash = new URLSearchParams(url.split("#")[1]);

								if (hash.get("access_token")) {
									try {
										fs.mkdirSync(`${app.getPath("appData")}/Youtube Download`);
									} catch { }

									fs.writeFileSync(`${app.getPath("appData")}/Youtube Download/token`, hash.get("access_token"), "utf-8");

									resolve(hash.get("access_token"));
								} else {
									const result = await dialog.showMessageBox({
										buttons: ["Quit", "Retry"],
										cancelId: 0,
										defaultId: 1,
										detail: "Failed to authenticate with your Google Account.",
										message: "Connection failed",
										type: "warning"
									});

									switch (result) {
										case 0:
											app.quit();
											break;

										case 1:
											launch();
											break;
									}
								}
							}
						});

						window.loadURL(`https://accounts.google.com/o/oauth2/v2/auth?client_id=${config.youtube.client_id}&response_type=token&redirect_uri=${config.youtube.redirect_uri}&scope=${config.youtube.scopes.join(" ")}`);
					}
				});
			}

			https.request("https://oauth2.googleapis.com/tokeninfo", {
				headers: {
					"Authorization": `Bearer ${config.token}`
				},
				method: "GET"
			}, async (res) => {
				if (res.statusCode === 200) {
					res.datas = "";
					res.on("data", (chunk) => res.datas += chunk);
					res.on("end", () => {
						res.datas = JSON.parse(res.datas);
						refreshToken.when = Date.now() + Number(res.datas.expires_in) * 1000;
					});
				} else {
					fs.rmSync(`${app.getPath("appData")}/Youtube Download/token`, {
						force: true
					});

					await refreshToken();
				}

				const window = new BrowserWindow({
					backgroundColor: nativeTheme.shouldUseDarkColors ? "#000" : "#FFF",
					minHeight: 400,
					minWidth: 400,
					title: "YouTube Alt",
					webPreferences: {
						preload: `${__dirname}/pages/online/preload.js`
					}
				});

				window.loadFile(`${__dirname}/pages/online/index.html`);
			}).end();
		} else {
			const window = new BrowserWindow({
				backgroundColor: nativeTheme.shouldUseDarkColors ? "#000" : "#FFF",
				minHeight: 400,
				minWidth: 400,
				title: "YouTube Alt",
				webPreferences: {
					preload: `${__dirname}/pages/offline/preload.js`
				}
			});

			window.loadFile(`${__dirname}/pages/offline/index.html`);
		}
	});
};

const Downloader = {
	ffmpeg: fs.existsSync(`${app.getPath("appData")}YouTube Alt/ffmpeg${process.platform === "darwin" ? "" : ".exe"}`),
	id: 0,
	window: null,

	download: async (url, path) => {
		const stream = fs.createWriteStream(path);
		let downloaded = 0;

		const getChunk = (start = 0, end = 1) => new Promise((resolve, reject) => {
			https.get(url, {
				headers: {
					"Range": `bytes=${start}-${end}`
				},
				timeout: 5000
			}, (res) => {
				if (res.statusCode === 206) {
					res.response = "";
					res.on("data", (chunk) => {
						res.response += chunk;
						downloaded += chunk.length;
					});
					res.on("error", (e) => reject(e));
					resolve(res);
				} else reject(res.statusCode);
			});
		});

		const length = await new Promise((resolve) => https.get(url, {
			headers: {
				"Range": "bytes=0-1"
			},
			timeout: 5000
		}, (res) => resolve(Number(res.headers["content-range"].split("/")[1]))));

		while (downloaded < length) {
			const start = downloaded;
			const end = Math.min(start + 2 ** 22, length - 1);

			const download = async () => {
				try {
					const res = await getChunk(start, end);
					res.pipe(stream, { end: end + 1 === length });
					await new Promise((resolve) => res.on("end", resolve));
				} catch {
					if (download.retries < 5) reject(`Failed to download part ${start}-${end}`)
				}
			};

			download.retries = 0;
			await download();
		}
	},

	launch: (datas) => new Promise((resolve) => {
		const id = Downloader.id++;
		if (!Downloader.window) {
			Downloader.window = new BrowserWindow({
				backgroundColor: nativeTheme.shouldUseDarkColors ? "#000" : "#FFF",
				minHeight: 300,
				minWidth: 200,
				resizable: false,
				title: "Downloads",
				webPreferences: {
					preload: `${__dirname}/pages/downloads/preload.js`
				}
			});

			Downloader.window.on("close", () => Downloader.window = null);
			Downloader.window.loadFile(`${__dirname}/pages/downloads/index.html`);
		}

		Downloader.window.webContents.send("new", id, datas);

		const tempPath = `${app.getPath("temp")}YouTube Alt/downloads/${datas.video.id}-${datas.quality}`;
		const downloadPath = `${app.getPath("documents")}/YouTube Alt/downloads/${datas.video.id}`;

		if (!fs.existsSync(tempPath)) fs.mkdirSync(tempPath, { recursive: true });
		if (!fs.existsSync(downloadPath)) fs.mkdirSync(downloadPath, { recursive: true });

		Downloader.download(datas.audio.url, `${tempPath}/audio.${datas.audio.container}`)
			.then(() => {
				Downloader.download(datas.video.url, `${tempPath}/video.${datas.video.container}`)
					.then(async () => {
						if (!Downloader.ffmpeg) {
							await Downloader.download(`https://github.com/Wixonic/YouTube-Alt/blob/Default/assets/ffmpeg${process.platform === "darwin" ? "" : ".exe"}`, `${app.getPath("appData")}YouTube Alt/ffmpeg${process.platform === "darwin" ? "" : ".exe"}`);
							Downloader.ffmpeg = true;
						}

						const process = spawn(`${app.getPath("appData")}YouTube Alt/ffmpeg${process.platform === "darwin" ? "" : ".exe"}`, [
							"-hide_banner",
							"-loglevel", "verbose",

							"-i", `${tempPath}/audio.${datas.audio.container}`,
							"-i", `${tempPath}/video.${datas.video.container}`,
							"-i", `${datas.cover}`,

							"-map", "0:a",
							"-map", "1:v",
							"-map", "2:v",

							"-c:a:0", "aac",
							"-c:v:1", "h264",

							"-disposition:v:2", "attached_pic",

							"-preset", "ultrafast",
							"-crf", "30",

							"-y",
							`${downloadPath}/${datas.format}.mp4`
						]);

						process.stdout.on("data", (chunk) => {
							process.stdout.write(chunk);
						});

						process.on("exit", (code) => {
							if (code === 0) {
								const notification = new Notification({
									title: "Video downloaded",
									body: `Successfully downloaded "${datas.title}" by ${datas.channel}`,
									icon: datas.cover,
									urgency: "low"
								});
								notification.show();
								resolve();
							} else {
								const notification = new Notification({
									title: "Download failed",
									body: `Failed to download "${datas.title}" by ${datas.channel}`,
									icon: datas.cover,
									urgency: "critical"
								});
								notification.show();
								resolve();
							}
						});
					}).catch((e) => {
						console.error(e);
					});
			}).catch((e) => {
				console.error(e);
			});
	})
};

app.on("ready", () => {
	app.rpc = new DiscordRPC.Client({ transport: "ipc" });
	app.rpc.login({ clientId: "1130539590026002464" })
		.then(() => {
			app.rpc.reset = () => app.rpc.setActivity({
				largeImageKey: "icon",
				largeImageText: "YouTube Alt",
				startTimestamp: app.startTimestamp
			});

			ipcMain.handle("discord:rpc", (_, datas) => {
				if (app.rpc) {
					if (datas) {
						app.rpc.setActivity({
							details: datas.details,
							largeImageKey: datas.largeImageKey || "icon",
							largeImageText: datas.largeImageText || "YouTube Alt",
							smallImageKey: datas.largeImageKey ? "icon" : undefined,
							smallImageText: datas.largeImageKey ? "YouTube Alt" : undefined,
							startTimestamp: app.startTimestamp,
							state: datas.state
						});
					} else app.rpc.reset();
				}
			});

			app.rpc.reset();
		}).catch((e) => {
			console.error(e);
			ipcMain.handle("discord:rpc", () => null);
		}).finally(() => {
			ipcMain.handle("youtube:download", (_, datas) => Downloader.launch(datas));

			ipcMain.handle("youtube:info", async (_, id, country = "EN") => {
				const path = `${app.getPath("temp")}YouTube Alt/ytdl-cache/${id}/info.json`;
				if (fs.existsSync(path)) {
					const file = JSON.parse(fs.readFileSync(path, "utf-8"));

					if (file.expireAt < Date.now()) {
						fs.rmSync(path);
						return "Expired";
					} else return file;
				} else {
					if (refreshToken.when < Date.now()) await refreshToken();

					try {
						fs.mkdirSync(path.replace("info.json", ""), { recursive: true });
					} catch { }
					const datas = await ytdl.getInfo(id, { lang: country });
					datas.expireAt = Date.now() + Number(datas.player_response.streamingData.expiresInSeconds) * 1000;
					fs.writeFileSync(path, JSON.stringify(datas), "utf-8");
					return datas;
				}
			});

			ipcMain.handle("youtube:request", (_, endpoint = "/") => new Promise(async (resolve) => {
				if (refreshToken.when < Date.now()) await refreshToken();

				https.request(`https://youtube.googleapis.com/v3${endpoint}`, {
					headers: {
						"Authorization": `Bearer ${config.token}`
					},
					method: "GET"
				}, (res) => {
					res.datas = "";
					res.on("data", (chunk) => res.datas += chunk);
					res.on("end", () => {
						res.datas = JSON.parse(res.datas);
						if (res.status === 401 && res.datas.error.status === "UNAUTHENTICATED") {
							BrowserWindow.getAllWindows().forEach((window) => window.destroy());
							launch();
						} else resolve({ status: { code: res.statusCode, message: res.statusMessage }, datas: res.datas });
					});
				}).end();
			}));

			launch();
		});

	app.on("activate", () => {
		if (BrowserWindow.getAllWindows().length === 0) launch();
	})
});

app.on("window-all-closed", () => {
	if (process.platform !== "darwin") app.quit();
});