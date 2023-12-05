import { BrowserWindow, nativeTheme as NativeTheme } from "electron";
import path from "path";

export type WindowOptions = { backgroundColor?: { light?: string, dark?: string }, path: string, show?: boolean };
export class Window {
	view: BrowserWindow;

	constructor(options: WindowOptions) {
		this.view = new BrowserWindow({
			backgroundColor: process.platform === "darwin" ? (NativeTheme.shouldUseDarkColors ? options.backgroundColor?.dark || "#0111" : options.backgroundColor?.light || "#0FFF") : (NativeTheme.shouldUseDarkColors ? options.backgroundColor?.dark || "#111" : options.backgroundColor?.light || "#FFF"),
			backgroundMaterial: "mica",
			minWidth: 500,
			minHeight: 400,
			show: false,
			transparent: process.platform === "darwin",
			titleBarStyle: "hiddenInset",
			vibrancy: "under-window",
			visualEffectState: "active",
			webPreferences: {
				preload: path.join(__dirname, "pages", "preload.js")
			}
		});

		this.view.loadFile(path.join(__dirname, options.path, "/index.html"));

		NativeTheme.on("updated", (): void => {
			if (options.backgroundColor?.dark && options.backgroundColor?.light && process.platform !== "darwin") this.view.setBackgroundColor(NativeTheme.shouldUseDarkColors ? options.backgroundColor?.dark || "#111" : options.backgroundColor?.light || "#FFF");
		});

		this.view.on("enter-full-screen", () => this.view.webContents.send("fullscreen", true));
		this.view.on("leave-full-screen", () => this.view.webContents.send("fullscreen", false));

		this.view.on("ready-to-show", (): void => {
			if (options?.show != false) this.view.show();
		});
	};
};