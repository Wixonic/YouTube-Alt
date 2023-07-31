downloader.onFail((_, id) => {
	document.body.innerHTML = `${id} fail`;
});

downloader.onNew((_, id, datas) => {
	document.body.innerHTML = `${id} started`;
});

downloader.onProgress((_, id, percent) => {
	document.body.innerHTML = `${id} progress (${(percent * 100).toFixed(1)}%)`;
});

downloader.onSuccess((_, id) => {
	document.body.innerHTML = `${id} success`;
});

downloader.onUpdate((_, id, text) => {
	document.body.innerHTML = `${id} update (${text})`;
});