import { } from "discord-rpc";
import { App, app, protocol, net } from "electron";

import "./ipc";
import { Window } from "./windows";

const Launch = async (): Promise<void> => {
	const main = new Window({
		path: "pages/main"
	});

	main.view.once("close", (): App => app.once("activate", Launch));
};

app.on("ready", Launch);
app.on("window-all-closed", (): void => { if (process.platform !== "darwin") app.quit(); });