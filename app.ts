import { } from "discord-rpc";
import { App, app } from "electron";

import "./ipc";
import { Window } from "./windows";

const Launch = async (): Promise<void> => {
	const main = new Window({
		path: "pages/main"
	});

	// DEV
	main.view.webContents.openDevTools({ mode: "detach" });
	main.view.webContents.on("dom-ready", (): void => main.view.webContents.send("id", "ZGb2hQA3hxo"));
	// DEV

	main.view.once("close", (): App => app.once("activate", Launch));
};

app.on("ready", Launch);
app.on("window-all-closed", (): void => { if (process.platform !== "darwin") app.quit(); });