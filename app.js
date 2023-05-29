const child_process = require("child_process");
const fs = require("fs");
const https = require("https");
const ytdl = require("ytdl-core");

const config = require("./config.json");
const { log } = require("./log.js");

/* try {
	fs.rmSync("./cache/",{
		recursive: true
	});
} catch {}
fs.mkdirSync("./cache/"); */

const server = https.createServer({
	cert: fs.readFileSync(config.server.ca.cert),
	key: fs.readFileSync(config.server.ca.key)
},async (req,res) => {
	const url = new URL(config.server.host + req.url.split("..").join(""));
	req.log = (text,format) => log(`${req.socket.remoteAddress}: ${url.pathname + url.search} - ${text}`,format);
	
	if (req.method == "GET") {
		try {
			const videoUrl = `https://www.youtube.com/watch?v=${url.searchParams.get("id")}`;

			const getInfos = () => new Promise(async (resolve) => {
				try {
					if (fs.existsSync(`./cache/${url.searchParams.get("id")}.json`)) {
						resolve(JSON.parse(fs.readFileSync(`./cache/${url.searchParams.get("id")}.json`,"utf-8")));
					} else {
						const infos = await ytdl.getInfo(videoUrl);
						fs.writeFileSync(`./cache/${url.searchParams.get("id")}.json`,JSON.stringify(infos),{
							encoding: "utf-8"
						});
						resolve(infos);
					}
				} catch {
					res.writeHead(404,"Not Found").end();
					req.log("Not Found","warn");
				}
			});

			const downloadWebM = (type) => {
				return new Promise(async (resolve) => {
					if (fs.existsSync(`./cache/${url.searchParams.get("id")}-${type}.webm`)) {
						resolve(`./cache/${url.searchParams.get("id")}-${type}.webm`);
					} else {
						ytdl.downloadFromInfo(await getInfos(),{
							filter: (format) => format.container == "webm",
							quality: `highest${type}`
						})
						.once("data",() => req.log(`Downloading ${type}...`,"info"))
						.once("finish",() => resolve(`./cache/${url.searchParams.get("id")}-${type}.webm`))
						.pipe(fs.createWriteStream(`./cache/${url.searchParams.get("id")}-${type}.webm`));
					}
				});
			};

			switch (url.searchParams.get("type")) {
				case "video":
					const send = () => {
						const totalLength = fs.statSync(`./cache/${url.searchParams.get("id")}.mp4`).size;
					
						if (req.headers.range) {
							const range = req.headers.range.replace("bytes=","").split("-");
							const start = range[0].length > 0 ? Number(range[0]) : 0;
							const end = range[1].length > 0 ? Number(range[1]) : Math.min(start + config.server.chunksize,totalLength - 1);
							const length = end - start + 1;
							
							res.writeHead(206,"Partial Content",{
								"Accept-Ranges": "bytes",
								"Content-Disposition": `attachment; filename="video.mp4"`,
								"Content-Length": length,
								"Content-Range": `bytes ${start}-${end}/${totalLength}`,
								"Content-Type": "video/mp4"
							});

							fs.createReadStream(`./cache/${url.searchParams.get("id")}.mp4`,{start,end}).pipe(res);
							req.log(`Partial Content (${start}-${end})`,"success");
						} else {
							res.writeHead(200,"OK",{
								"Content-Disposition": `attachment; filename="video.mp4"`,
								"Content-Length": totalLength,
								"Content-Type": "video/mp4"
							});
							res.end(fs.readFileSync(`./cache/${url.searchParams.get("id")}.mp4`));
						}	
					};

					if (fs.existsSync(`./cache/${url.searchParams.get("id")}.mp4`)) {
						send();
					} else {
						await downloadWebM("audio");
						await downloadWebM("video");
						req.log(`Merging to mp4...`,"info");
						const cs = child_process.spawn("ffmpeg",[
							"-hide_banner",
							"-loglevel","info",

							"-i",`./cache/${url.searchParams.get("id")}-video.webm`,
							"-i",`./cache/${url.searchParams.get("id")}-audio.webm`,

							"-preset","ultrafast",

							"-y",
							`./cache/${url.searchParams.get("id")}.mp4`
						],{
							windowsHide: true
						});
						cs.on("close",(code) => {
							log(`ffmpeg exited: ${code}`,"log");
							send();
						});
					}
					break;
				
				case "poster":
					const thumbnail = (await getInfos()).videoDetails.thumbnails;
					res.writeHead(302,"OK",{
						"Content-Disposition": `attachment; filename="poster.jpg"`,
						"Content-Type": "image/jpg",
						"Location": `https://i.ytimg.com/vi/${url.searchParams.get("id")}/maxresdefault.jpg`
					}).end(JSON.stringify(thumbnail));
					req.log("OK","success");
					break;
				
				case "player":
					const infos = await getInfos();
					const parsing = {
						id: url.searchParams.get("id"),
						title: infos.videoDetails.title,
						channel: infos.videoDetails.author.name,
						channelId: infos.videoDetails.author.id,
						verified: infos.videoDetails.author.verified
					};

					let HTML = fs.readFileSync("./player.html","utf-8");
					for (let name in parsing) {
						HTML = HTML.split(`{{${name.toUpperCase()}}}`).join(parsing[name]);
					}

					res.writeHead(200,"OK",{
						"Content-Disposition": "inline",
						"Content-Length": HTML.length,
						"Content-Type": "text/html; charset=utf-8"
					}).end(HTML);
					req.log("OK","success");
					break;
				
				default:
					res.writeHead(400,"Bad Request").end();
					req.log("Bad Request","log");
					break;
			}
		} catch (e) {
			res.writeHead(500,"Internal Server Error").end();
			req.log(`Internal Server Error: ${e}`,"error");
		}
	} else {
		res.writeHead(405,"Method Not Allowed").end();
		req.log("Method Not Allowed","warn");
	}
});

server.listen(config.server.port.https,() => log(`Server is listening on :${config.server.port.https}`,"info"));