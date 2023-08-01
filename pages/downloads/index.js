downloader.onFail((_, id) => {
	document.body.innerHTML = `${id} fail<br />${document.body.innerHTML}`;
});

downloader.onNew((_, id, datas) => {
	document.body.innerHTML = `${id} started<br />${document.body.innerHTML}`;
});

downloader.onProgress((_, id, percent) => {
	document.body.innerHTML = `${id} progress (${(percent * 100).toFixed(1)}%)<br />${document.body.innerHTML}`;
});

downloader.onSuccess((_, id) => {
	document.body.innerHTML = `${id} success<br />${document.body.innerHTML}`;
});

downloader.onUpdate((_, id, text) => {
	document.body.innerHTML = `${id} update (${text})<br />${document.body.innerHTML}`;
});