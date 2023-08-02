class Download {
	static list = {};

	constructor(id, datas) {
		this.id = id;
		this.startTimestamp = datas.startTimestamp;

		this.element = document.createElement("div");
		this.element.classList.add("process");

		const header = document.createElement("header");
		const footer = document.createElement("footer");

		header.innerHTML = `<img class="cover" src="${datas.cover}" alt="Video's cover" /><div class="title">${datas.title}</div><div class="channel">${datas.channel}</div><div class="quality"><span class="height">${datas.quality.height}</span><span class="separator">p</span><span class="fps">${datas.quality.fps}</span></div>`;

		const progressBarContainer = document.createElement("div");
		this.progressBar = document.createElement("div");
		const progressText = document.createElement("div");
		this.progressPercent = document.createElement("div");
		this.progressTime = document.createElement("div");

		progressBarContainer.classList.add("progress", "container");
		this.progressBar.classList.add("progress", "bar");
		progressText.classList.add("progress", "text");
		this.progressPercent.classList.add("progress", "percent");
		this.progressTime.classList.add("progress", "time");

		progressBarContainer.append(this.progressBar);
		progressText.append(this.progressPercent, this.progressTime);
		footer.append(progressBarContainer, progressText);

		this.element.append(header, footer);
		document.body.prepend(this.element);
	};

	fail() {

	};

	progress(percent) {
		this.progressBar.style.width = `${percent * 100}%`;
		this.progressPercent.innerHTML = `Progress: ${Math.floor(percent * 1000) / 10}%`;

		let time = (Date.now() - this.startTimestamp) / percent;
		time /= 1000;

		console.log(time);

		switch (true) {
			case time > 60 * 60:
				time = Math.floor(time / 60 / 60);
				time = `${time > 1 ? time : "one"} hour${time > 1 ? "s" : ""}`;
				break;

			case time > 60:
				time = Math.floor(time / 60);
				time = `${time > 1 ? time : "one"} minute${time > 1 ? "s" : ""}`;
				break;

			default:
				time = "less than a minute";
		};

		this.progressTime.innerHTML = `Time left: ${time}`;
	};

	success() {

	};

	update(text) {

	};
};

downloader.onFail((_, id) => Download.list[id].fail());
downloader.onNew((_, id, datas) => Download.list[id] = new Download(id, datas));
downloader.onProgress((_, id, percent) => Download.list[id].progress(percent));
downloader.onSuccess((_, id) => Download.list[id].success());
downloader.onUpdate((_, id, text) => Download.list[id].update(text));