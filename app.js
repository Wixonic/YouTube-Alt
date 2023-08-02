const { spawn } = require("child_process");
const DiscordRPC = require("discord-rpc");
const dns = require("dns");
const { app, BrowserWindow, dialog, ipcMain, nativeTheme, Notification } = require("electron");
const fs = require("fs");
const https = require("https");
const ytdl = require("ytdl-core");

console.log({
	"appData": app.getPath("appData"),
	"tmp": app.getPath("temp")
});

const config = require("./config.json");

const isDev = process.env.APP_DEV === "true";

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
	id: 0,
	window: null,

	launch: (datas, quality=1) => new Promise(async (resolve) => {
		await Downloader.launchWindow();

		const id = Downloader.id++;
		datas.startTimestamp = Date.now();

		const downloadPath = `${app.getPath("documents")}/YouTube Alt/downloads/${datas.id}`;
		if (!fs.existsSync(downloadPath)) fs.mkdirSync(downloadPath, { recursive: true });

		let ffmpegPath = require("ffmpeg-static");
		if (!isDev) ffmpegPath = ffmpegPath.replace("app.asar", "app.asar.unpacked");

		const ffmpeg = spawn(ffmpegPath, [
			"-hide_banner",
			"-loglevel", "verbose",

			"-i", datas.audio.url,
			"-i", datas.video.url,
			"-i", datas.cover,

			"-map", "0:a",
			"-map", "1:v",
			"-map", "2:v",

			"-c:a:0", "aac",
			"-c:v:1", "h264",

			"-disposition:v:2", "attached_pic",

			"-preset", "ultrafast",
			"-crf", [24, 30, 40][quality], // [high quality, recommended, fastest encoding]

			"-y",
			`${downloadPath}/${datas.format}.mp4`
		]);

		delete datas.audio.url;
		delete datas.video.url;

		Downloader.window.webContents.send("new", id, datas);

		delete datas.cover;

		fs.writeFileSync(`${downloadPath}/info.json`, JSON.stringify(datas), "utf-8");

		const output = (chunk) => {
			process.stdout.write(chunk);
			chunk = chunk.toString();

			if (chunk.startsWith("frame")) {
				try {
					Downloader.window.webContents.send("progress", id, Number(chunk.split("fps")[0].split("=")[1]) / (datas.duration * datas.quality.fps));
				} catch { }
			}
		};
		ffmpeg.stdout.on("data", output);
		ffmpeg.stderr.on("data", output);

		ffmpeg.on("exit", (code) => {
			if (code === 0) {
				const notification = new Notification({
					title: "Video downloaded",
					body: `Successfully downloaded "${datas.title}" by ${datas.channel}`,
					icon: datas.cover,
					urgency: "low"
				});
				notification.show();
				Downloader.window.webContents.send("success", id);
				resolve();
			} else {
				const notification = new Notification({
					title: "Download failed",
					body: `Failed to download "${datas.title}" by ${datas.channel}`,
					icon: datas.cover,
					urgency: "critical"
				});
				notification.show();
				Downloader.window.webContents.send("fail", id);
				resolve();
			}
		});
	}),

	launchWindow: () => new Promise((resolve) => {
		if (!Downloader.window) {
			Downloader.window = new BrowserWindow({
				backgroundColor: nativeTheme.shouldUseDarkColors ? "#000" : "#FFF",
				thickFrame: false,
				minHeight: 400,
				height: BrowserWindow.getAllWindows()[0].getSize()[1] * 0.8,
				minWidth: 300,
				width: BrowserWindow.getAllWindows()[0].getSize()[0] * 0.8,
				parent: BrowserWindow.getAllWindows()[0],
				title: "Downloads",
				webPreferences: {
					preload: `${__dirname}/pages/downloads/preload.js`
				}
			});

			Downloader.window.on("close", () => Downloader.window = null);
			Downloader.window.loadFile(`${__dirname}/pages/downloads/index.html`);
			Downloader.window.on("ready-to-show", resolve)
		} else resolve();
	})
};

app.on("ready", () => {
	ipcMain.handle("isDev", () => isDev);

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