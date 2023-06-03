addEventListener("DOMContentLoaded",() => {
	youtube.request("/channels?maxResults=1&mine=true&part=snippet&fields=items(snippet(thumbnails(default(url)),country))")
	.then((channels) => {
		try {
			document.querySelector("header > div.profile > img.logo").src = channels.datas.items[0].snippet.thumbnails.default.url;

			youtube.request(`/videos?chart=mostPopular&regionCode=${channels.datas.items[0].snippet.country}&maxResults=50&part=snippet&fields=items(id,snippet(title,channelId,channelTitle,publishedAt,thumbnails(high(url),maxres(url))),statistics(likeCount,viewCount))`)
			.then((videos) => {
				console.log(videos);
				if (videos.status.code === 200) {
					for (let video of videos.datas.items) {
						document.querySelector("div.main").innerHTML += `<div class="video" id="${video?.id}"><div class="title">${video?.snippet?.title}</div><img class="thumbnail" src="${video?.snippet?.thumbnails?.maxres?.url || video?.snippet?.thumbnails?.high?.url}" /<div class="channel"></div></div>`;
					}
				} else {
					console.log(videos);
				}
			});
		} catch {}
	});
});