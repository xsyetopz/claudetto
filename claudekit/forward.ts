// Shared by every local stand-in for the Messages API that sends some requests on to the real one.

import { objectOf } from "./summary-cost/json.ts";

/** The token counts of one answer, as the API names them. */
export interface Usage {
	input_tokens?: number;
	output_tokens?: number;
	cache_creation_input_tokens?: number;
	cache_read_input_tokens?: number;
}

/** The API host a forwarded request goes to when the caller names none. */
export const UPSTREAM = "https://api.anthropic.com";

/** Keeps the path and query of `url` and swaps in the host of `upstream`. */
export const targetOf = (url: string, upstream: string): string => {
	const incoming = new URL(url);
	const to = new URL(upstream);
	to.pathname = incoming.pathname;
	to.search = incoming.search;
	return to.toString();
};

const TOKEN_KEYS = [
	"input_tokens",
	"output_tokens",
	"cache_creation_input_tokens",
	"cache_read_input_tokens",
] as const;

const tokensOf = (value: unknown): Usage | undefined => {
	const held = objectOf(value);
	const usage: Usage = {};
	let any = false;
	for (const key of TOKEN_KEYS) {
		const count = held[key];
		if (typeof count === "number") {
			usage[key] = count;
			any = true;
		}
	}
	return any ? usage : undefined;
};

/** Reads the tokens of a streamed answer from its `message_start` event, or of a JSON answer from its body. */
export const usageIn = (text: string): Usage | undefined => {
	const line = text
		.split("\n")
		.find((l) => l.startsWith("data:") && l.includes('"message_start"'));
	let parsed: unknown;
	try {
		parsed = JSON.parse(line === undefined ? text : line.slice(5).trim());
	} catch {
		return undefined;
	}
	const held = objectOf(parsed);
	return (
		tokensOf(objectOf(held["message"])["usage"]) ?? tokensOf(held["usage"])
	);
};

/** The request headers to send on, the bearer kept; `accept-encoding` goes so the body that comes back is plain. */
export const forwardedHeaders = (request: Request): Headers => {
	const headers = new Headers(request.headers);
	for (const name of ["host", "content-length", "accept-encoding"]) {
		headers.delete(name);
	}
	return headers;
};

/** Sends `request` with `body` to `upstream`; it throws when the host cannot be reached. */
export const sendOn = (
	request: Request,
	body: string,
	upstream: string,
): Promise<Response> => {
	const hasBody = request.method !== "GET" && request.method !== "HEAD";
	return fetch(targetOf(request.url, upstream), {
		method: request.method,
		headers: forwardedHeaders(request),
		...(hasBody && body !== "" ? { body } : {}),
		redirect: "manual",
	});
};

/** The headers of an upstream answer that still hold once the body is handed on decoded. */
export const answerHeaders = (response: Response): Headers => {
	const out = new Headers(response.headers);
	for (const name of ["content-encoding", "content-length"]) {
		out.delete(name);
	}
	return out;
};
