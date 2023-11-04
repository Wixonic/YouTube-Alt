import { App, app } from "electron";

import "./ipc";
import { Window } from "./windows";

const Launch = async (): Promise<void> => {
	const main = new Window({
		path: "pages/main"
	});

	if (process.env.APP_DEV ? (process.env.APP_DEV.trim() == "true") : false) main.view.webContents.openDevTools({ mode: "detach" });

	main.view.once("close", (): App => app.once("activate", Launch));
};

app.on("ready", Launch);
app.on("window-all-closed", (): void => { if (process.platform !== "darwin") app.quit(); });