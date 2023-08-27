import http from "http";
import https from "https";
import net from "net";
import stream from "stream";

export type HttpMethod = "GET" | "HEAD" | "POST" | "PUT" | "DELETE" | "CONNECT" | "OPTIONS" | "TRACE" | "PATCH";
export type RequestOptions = { headers?: http.OutgoingHttpHeaders, method?: HttpMethod, timeout?: number, url: string | URL };

export class Request {
	private _options: RequestOptions;
	_request: http.ClientRequest;

	private _initRequest(): http.ClientRequest {
		if (this._request?.writableFinished == false) {
			this._request.destroy();
		}

		this._request = (new URL(this.url).protocol === "https:" ? https : http).request(this.url, {
			headers: this.headers,
			method: this.method,
			timeout: this.timeout
		});

		return this._request;
	};

	constructor(options: RequestOptions) {
		this._options = options;
		this._initRequest();
	};

	status: {
		code: number,
		message: string
	};

	get headers(): http.OutgoingHttpHeaders {
		return this._options.headers;
	};

	setHeaders(headers: http.OutgoingHttpHeaders) {
		this._options.headers = headers;
		this._initRequest();
	};

	get method(): HttpMethod {
		return this._options.method;
	};

	set method(method: HttpMethod) {
		this._options.method = method;
		this._initRequest();
	};

	get timeout(): number {
		return this._options.timeout;
	};

	set timeout(timeout: number) {
		this._options.timeout = timeout;
		this._initRequest();
	};

	get url(): string | URL {
		return this._options.url;
	};

	set url(url: string | URL) {
		this._options.url = url;
		this._initRequest();
	};

	off(event: string | symbol, listener: (...args: any[]) => void): this {
		this._request.off(event, listener);
		return this;
	};

	on(event: "abort", listener: () => void): this;
	on(event: "connect", listener: (response: http.IncomingMessage, socket: net.Socket, head: Buffer) => void): this;
	on(event: "continue", listener: () => void): this;
	on(event: "information", listener: (info: http.InformationEvent) => void): this;
	on(event: "response", listener: (response: http.IncomingMessage) => void): this;
	on(event: "socket", listener: (socket: net.Socket) => void): this;
	on(event: "timeout", listener: () => void): this;
	on(event: "upgrade", listener: (response: http.IncomingMessage, socket: net.Socket, head: Buffer) => void): this;
	on(event: "close", listener: () => void): this;
	on(event: "drain", listener: () => void): this;
	on(event: "error", listener: (err: Error) => void): this;
	on(event: "finish", listener: () => void): this;
	on(event: "pipe", listener: (src: stream.Readable) => void): this;
	on(event: "unpipe", listener: (src: stream.Readable) => void): this;
	on(event: string | symbol, listener: (...args: any[]) => void): this {
		this._request.on(event, listener);
		return this;
	};

	once(event: "abort", listener: () => void): this;
	once(event: "connect", listener: (response: http.IncomingMessage, socket: net.Socket, head: Buffer) => void): this;
	once(event: "continue", listener: () => void): this;
	once(event: "information", listener: (info: http.InformationEvent) => void): this;
	once(event: "response", listener: (response: http.IncomingMessage) => void): this;
	once(event: "socket", listener: (socket: net.Socket) => void): this;
	once(event: "timeout", listener: () => void): this;
	once(event: "upgrade", listener: (response: http.IncomingMessage, socket: net.Socket, head: Buffer) => void): this;
	once(event: "close", listener: () => void): this;
	once(event: "drain", listener: () => void): this;
	once(event: "error", listener: (err: Error) => void): this;
	once(event: "finish", listener: () => void): this;
	once(event: "pipe", listener: (src: stream.Readable) => void): this;
	once(event: "unpipe", listener: (src: stream.Readable) => void): this;
	once(event: string | symbol, listener: (...args: any[]) => void): this {
		this._request.once(event, listener);
		return this;
	};

	async send(): Promise<http.IncomingMessage> {
		return new Promise((callback): http.ClientRequest => this._request.end((): void => {
			this.on("response", async (response): Promise<void> => {
				this.status = {
					code: response.statusCode,
					message: response.statusMessage
				};

				console.log(this.url.toString(), this.status.code, this.status.message);

				switch (true) {
					case (this.status.code == 301 || this.status.code == 302 || this.status.code == 303 || this.status.code == 307 || this.status.code == 308) && response.headers.location != null:
						this.url = new URL(response.headers.location);
						callback(await this.send());
						break;

					default:
						callback(response);
						break;
				}
			});
		}));
	};
};