const fs = require("fs");
const https = require("https");

const config = require("./config.json");
const { log } = require("./log.js");

let requestCount = 0;
const server = https.createServer({
	cert: fs.readFileSync(config.server.ca.cert),
	key: fs.readFileSync(config.server.ca.key)
},(req,res) => {
	req.id = `${requestCount}-${req.socket.remoteAddress}`;
	req.log = (text,format) => log(`${req.id}: ${text}`,format || "log");

	const url = new URL(config.server.host + req.url.split("..").join(""));
	const params = new URLSearchParams(url.search);

	req.log(`New request. Asked: ${req.method} ${url.toString()}`);

	if (req.method === "GET") {
		if 
	} else {
		req.log("Forbidden.","error");

		const body = `This url is <b>forbidden</b>. Please contact the guy who gives you this...`;
		res.writeHead(403,{
			"Content-Length": Buffer.byteLength(body),
			"Content-Type": "text/html"
		}).end(body);
	}
});

server.listen(config.server.port.https,() => log(`Server is listening on :${config.server.port.https}`,"info"));