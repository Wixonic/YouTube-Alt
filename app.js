const dns = require("dns");
const { app, BrowserWindow, dialog, ipcMain, nativeTheme } = require("electron");
const fs = require("fs");
const https = require("https");

const config = require("./config.json");

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
							minHeight: 300,
							minWidth: 400,
							title: "Connect to your Google Account"
						});
	
						window.webContents.on("will-redirect",async (e,url) => {
							if (url.startsWith(config.youtube.redirect_uri)) {
								e.preventDefault();
								window.destroy();
	
								const hash = new URLSearchParams(url.split("#")[1]);
	
								if (hash.get("access_token")) {
									fs.writeFileSync(`${app.getPath("appData")}/token`,hash.get("access_token"),{
										encoding: "utf-8"
									});
	
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
			},(res) => {
				if (res.statusCode === 200) {
					const window = new BrowserWindow({
						backgroundColor: nativeTheme.shouldUseDarkColors ? "#000" : "#FFF",
						minHeight: 300,
						minWidth: 400,
						title: "YouTube Downloader",
						webPreferences: {
							preload: `${__dirname}/pages/online/preload.js`
						}
					});
					
					window.loadFile(`${__dirname}/pages/online/index.html`);
				} else {
					fs.rmSync(`${app.getPath("appData")}/token`,{
						force: true
					});
	
					launch();
				}
			}).end();
		} else {
			const window = new BrowserWindow({
				backgroundColor: nativeTheme.shouldUseDarkColors ? "#000" : "#FFF",
				minHeight: 300,
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
	ipcMain.handle("youtube:request",(_,endpoint="/") => new Promise((resolve) => {
		https.request(`https://youtube.googleapis.com/v3${endpoint}`,{
			headers: {
				"Authorization": `Bearer ${config.token}`
			},
			method: "GET"
		},(res) => {
			res.datas = "";
			res.on("data",(chunk) => res.datas += chunk);
			res.on("end",() => resolve({status: {code: res.statusCode,message: res.statusMessage},datas: JSON.parse(res.datas)}));
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