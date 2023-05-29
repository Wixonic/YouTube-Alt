console.log("\x1b[H\x1b[?25l\x1b[2J");

const code = (code=0) => `\x1B[${code}m`;
const type = (type="default") => {
	switch (type) {
		case "error":
			return code(31);
		
		case "info":
			return code(96);
		
		case "log":
			return code(90);

		case "success":
			return code(32);

		case "warn":
			return code(33);

		default:
			return code();
	}
};

const log = (text="",format) => {
	if (typeof format === "string") {
		format = {
			type: format
		};
	} else if (typeof format !== "object") {
		format = {};
	}


	const f = (n=0,s=2) => {
		let r = String(n);
		while (r.length < s) {
			r = "0" + r;
		}
		return r;
	};
	const now = new Date();
	const prelog = (text) => console.log("\x1b[2K\x1b[0G" + code() + code(90) + `${f(now.getDate())}/${f(now.getMonth() + 1)}/${now.getFullYear()} ${f(now.getHours())}:${f(now.getMinutes())}:${f(now.getSeconds())}.${f(now.getMilliseconds(),3)}: ${code() + text}`);

	if (format.code) {
		text = code(format.code) + text;
	} else if (format.type) {
		text = type(format.type) + text;
	}

	prelog(text);
};


module.exports = {code, log, type};