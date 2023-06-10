const { spawn } = require("child_process");
const DiscordRPC = require("discord-rpc");
const dns = require("dns");
const { app, BrowserWindow, dialog, ipcMain, nativeTheme, ipcRenderer } = require("electron");
const fs = require("fs");
const https = require("https");
const ytdl = require("ytdl-core");

const config = require("./config.json");

const refreshToken = () => new Promise((resolve) => {
	dns.resolve4("wixonic.fr",async (error) => {
		if (!error) { // isOffline
			const window = new BrowserWindow({
				backgroundColor: nativeTheme.shouldUseDarkColors ? "#000" : "#FFF",
				minHeight: 400,
				minWidth: 400,
				title: "Connect to your Google Account"
			});

			window.webContents.on("will-redirect",async (e,url) => {
				if (url.startsWith(config.youtube.redirect_uri)) {
					e.preventDefault();
					window.destroy();

					const hash = new URLSearchParams(url.split("#")[1]);

					if (hash.get("access_token")) {
						fs.writeFileSync(`${app.getPath("appData")}/token`,hash.get("access_token"),"utf-8");

						config.token = hash.get("access_token");
						resolve(config.token);
					} else {
						const result = await dialog.showMessageBox({
							buttons: ["Quit","Retry"],
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
				title: "YouTube Downloader",
				webPreferences: {
					preload: `${__dirname}/pages/offline/preload.js`
				}
			});

			window.loadFile(`${__dirname}/pages/offline/index.html`);
		}
	});
});

const launch = () => {
	dns.resolve4("wixonic.fr",async (error) => {
		if (!error) { // isOnline
			if (!config.token) {
				config.token = await new Promise(async (resolve) => {
					if (fs.existsSync(`${app.getPath("appData")}/token`)) {
						resolve(fs.readFileSync(`${app.getPath("appData")}/token`,"utf-8"));
					} else {
						const window = new BrowserWindow({
							backgroundColor: nativeTheme.shouldUseDarkColors ? "#000" : "#FFF",
							minHeight: 400,
							minWidth: 400,
							title: "Connect to your Google Account"
						});
	
						window.webContents.on("will-redirect",async (e,url) => {
							if (url.startsWith(config.youtube.redirect_uri)) {
								e.preventDefault();
								window.destroy();
	
								const hash = new URLSearchParams(url.split("#")[1]);
	
								if (hash.get("access_token")) {
									fs.writeFileSync(`${app.getPath("appData")}/token`,hash.get("access_token"),"utf-8");
	
									resolve(hash.get("access_token"));
								} else {
									const result = await dialog.showMessageBox({
										buttons: ["Quit","Retry"],
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
	
			https.request("https://oauth2.googleapis.com/tokeninfo",{
				headers: {
					"Authorization": `Bearer ${config.token}`
				},
				method: "GET"
			},async (res) => {
				if (res.statusCode === 200) {
					res.datas = "";
					res.on("data",(chunk) => res.datas += chunk);
					res.on("end",() => {
						res.datas = JSON.parse(res.datas);
						setTimeout(refreshToken,Number(res.datas.expires_in) * 1000);
					});
				} else {
					fs.rmSync(`${app.getPath("appData")}/token`,{
						force: true
					});
	
					await refreshToken();
				}

				const window = new BrowserWindow({
					backgroundColor: nativeTheme.shouldUseDarkColors ? "#000" : "#FFF",
					minHeight: 400,
					minWidth: 400,
					title: "YouTube Downloader",
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
				title: "YouTube Downloader",
				webPreferences: {
					preload: `${__dirname}/pages/offline/preload.js`
				}
			});

			window.loadFile(`${__dirname}/pages/offline/index.html`);
		}
	});
};

app.on("ready",() => {
	ipcMain.handle("youtube:download",(_,datas) => new Promise(async (resolve,reject) => {
		class Downloader {
			constructor (path,url) {
				this.downloaded = 0;
				this.length = 0;
				this.path = path;
				this.stream = fs.createWriteStream(path);
				this.url = url;
			};

			get percent () {
				try {
					return this.downloaded / this.length * 100;
				} catch {
					return 0;
				}
			};
			
			progress (percent) {};

			getChunk (start=0,end=1) {
				return new Promise((resolve,reject) => {
					https.get(this.url,{
						headers: {
							"Range": `bytes=${start}-${end}`
						},
						timeout: 5000
					},(res) => {
						if (res.statusCode === 206) {
							res.response = "";
							res.on("data",(chunk) => {
								res.response += chunk;
								this.downloaded += chunk.length;
							});
							res.on("error",(e) => reject(e));
							resolve(res);
						} else {
							reject(res.statusCode);
						}
					});
				});
			};

			start () {
				return new Promise(async (resolve,reject) => {
					this.length = await new Promise((resolve) => https.get(this.url,{
						headers: {
							"Range": "bytes=0-1"
						},
						timeout: 5000
					},(res) => resolve(Number(res.headers["content-range"].split("/")[1]))));

					while (this.downloaded < this.length) {
						const start = this.downloaded;
						const end = Math.min(start + 2 ** 20,this.length - 1);

						const download = async () => {
							try {
								const res = await this.getChunk(start,end);
								res.pipe(this.stream,{end: end + 1 === this.length});
								this.progress(this.percent);
								await new Promise((resolve) => res.on("end",resolve));
							} catch {
								if (download.retries < 5) {
									reject(`Failed to download part ${start}-${end}`)
								}
							}
						};

						download.retries = 0;
						await download();
					}

					resolve();
				});
			};
		};
		
		const tempPath = `${app.getPath("temp")}YouTube Download/downloads/${datas.id}-${datas.quality}`;
		const downloadPath = `${app.getPath("documents")}/YouTube Download/downloads/${datas.id}`;

		if (!fs.existsSync(tempPath)) {
			fs.mkdirSync(tempPath,{recursive: true});
		}

		if (!fs.existsSync(downloadPath)) {
			fs.mkdirSync(downloadPath,{recursive: true});
		}

		const progress = (log) => console.log((new Date()).toISOString(),log);

		const audioDownloader = new Downloader(`${tempPath}/audio.webm`,datas.audio);
		const videoDownloader = new Downloader(`${tempPath}/video.webm`,datas.video);

		audioDownloader.progress = (percent) => progress(`Downloading audio: ${percent.toFixed(2)}%`);
		videoDownloader.progress = (percent) => progress(`Downloading video: ${percent.toFixed(2)}%`);

		audioDownloader.start();
		videoDownloader.start();

		const ffmpegProcess = spawn("ffmpeg",[
			"-hide_banner",
			"-i",`${tempPath}/audio.webm`,
			"-i",`${tempPath}/video.webm`,
			/* "-i",`${datas.cover}`, */
			"-metadata",`title=${datas.title}`,
			"-metadata",`artist=${datas.channel}`,
			"-metadata",`creation_date=${datas.publishDate}`,
			"-c:a","aac",
			"-c:v","libx264",
			"-preset","ultrafast",
			"-crf","30",
			"-y",
			`${downloadPath}/${datas.quality}.mp4`
		]);

		ffmpegProcess.stdout.on("data",(chunk) => process.stdout.write(chunk));
		ffmpegProcess.stderr.on("data",(chunk) => process.stderr.write(chunk));

		ffmpegProcess.on("exit",(code) => {
			if (code === 0) {
				resolve();
			} else {
				console.error(`ffmpeg exit with ${code}`);
			}
		});
	}));

	ipcMain.handle("youtube:info",async (_,id,country="EN") => {
		const path = `${app.getPath("temp")}YouTube Download/ytdl-cache/${id}/info.json`;
		if (fs.existsSync(path)) {
			const file = JSON.parse(fs.readFileSync(path,"utf-8"));

			console.log(`Cached - expiring ${new Date(file.expireAt).toLocaleString()} - `,file.expireAt);

			if (file.expireAt < Date.now()) {
				fs.rmSync(path);
				return "Expired";
			} else {
				return file;
			}
		} else {
			try {
				fs.mkdirSync(path.replace("info.json",""),{recursive: true});
			} catch {}
			const datas = await ytdl.getInfo(id,{lang: country});
			datas.expireAt = Date.now() + datas.player_response.streamingData.expiresInSeconds;
			fs.writeFileSync(path,JSON.stringify(datas),"utf-8");
			return datas;
		}
	});

	ipcMain.handle("youtube:request",(_,endpoint="/") => new Promise((resolve) => {
		https.request(`https://youtube.googleapis.com/v3${endpoint}`,{
			headers: {
				"Authorization": `Bearer ${config.token}`
			},
			method: "GET"
		},(res) => {
			res.datas = "";
			res.on("data",(chunk) => res.datas += chunk);
			res.on("end",() => {
				res.datas = JSON.parse(res.datas);
				if (res.status === 401 && res.datas.error.status === "UNAUTHENTICATED") {
					BrowserWindow.getAllWindows().forEach((window) => window.destroy());
					launch();
				} else {
					resolve({status: {code: res.statusCode,message: res.statusMessage},datas: res.datas});
				}
			});
		}).end();
	}));

	launch();

	app.on("activate",() => {
		if (BrowserWindow.getAllWindows().length === 0) {
			launch();
		}
	})
});

app.on("window-all-closed",() => {
	if (process.platform !== "darwin") {
		app.quit();
	}
});