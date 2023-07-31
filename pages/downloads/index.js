downloader.onFail((e, id) => {
	console.log(e, id);
	document.body.innerHTML = `${id} fail<br />${document.body.innerHTML}`;
});

downloader.onNew((e, id, datas) => {
	console.log(e, id, datas);
	document.body.innerHTML = `${id} started<br />${document.body.innerHTML}`;
});

downloader.onProgress((e, id, percent) => {
	console.log(e, id, percent);
	document.body.innerHTML = `${id} progress (${Math.ceil(percent * 100)}%)<br />${document.body.innerHTML}`;
});

downloader.onSuccess((e, id) => {
	console.log(e, id);
	document.body.innerHTML = `${id} success<br />${document.body.innerHTML}`;
});

downloader.onUpdate((e, id, text) => {
	console.log(e, id, text);
	document.body.innerHTML = `${id} update (${text})<br />${document.body.innerHTML}`;
});