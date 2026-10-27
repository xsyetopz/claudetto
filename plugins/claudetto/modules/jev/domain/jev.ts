// The call of the TypeSafe API that the CLI `claudetto-decide` and the mod share: the model, the retry on 429 and 529, and the reading of a yes or no answer.
// No `node:` import and no `Bun`, for the hooks module. A function here gets the `fetch` and the `sleep` of its caller, and never `$`.

import {
	ATTEMPT_TIMEOUT_MS,
	BACKOFF_MS,
	ERROR_BODY_MAX,
	TRIES,
} from "../limits.ts";

export const JEV_API = "https://api.typesafe.ai/v1/systemone";
export const JEV_MODEL = "jev-latest";

/** A reply of the API with an error status. */
export class ApiError extends Error {
	readonly status: number;

	constructor(status: number, message: string) {
		super(message);
		this.status = status;
	}
}

/** The part of a reply that the retry reads. */
export interface JevReply {
	readonly status: number;
	readonly ok: boolean;
	readonly text: string;
}

/** `$.http` in the mod. */
export interface JevHttp {
	readonly fetch: (
		url: string,
		init: {
			readonly method: string;
			readonly headers: Record<string, string>;
			readonly body: string;
		},
	) => Promise<JevReply>;
}

/** `$.clock` in the mod. */
export interface JevClock {
	readonly sleep: (
		ms: number,
		options?: { readonly signal: AbortSignal },
	) => Promise<unknown>;
}

/** The state of a request: text, or an object or an array with named parts. */
export type JevState = string | object;

/** The request body for a state and named questions. */
export const jevBody = (state: JevState, questions: object) => ({
	state,
	model: JEV_MODEL,
	questions,
});

/** The JSON of the first `ok` reply of `send`. A 429 or a 529 waits `BACKOFF_MS`, doubled for each retry, up to `TRIES` tries. */
export const retried = (
	once: () => Promise<JevReply>,
	sleep: (ms: number) => Promise<unknown>,
): Promise<unknown> => {
	const attempt = async (i: number): Promise<unknown> => {
		const res = await once();
		if (res.ok) {
			return JSON.parse(res.text);
		}
		if ((res.status === 429 || res.status === 529) && i < TRIES - 1) {
			await sleep(BACKOFF_MS * 2 ** i);
			return attempt(i + 1);
		}
		const detail = res.text.slice(0, ERROR_BODY_MAX);
		throw new ApiError(res.status, `TypeSafe API ${res.status}: ${detail}`);
	};
	return attempt(0);
};

/** Rejects after `ATTEMPT_TIMEOUT_MS`, unless `signal` aborts the wait first. */
const timeout = async (
	clock: JevClock,
	signal: AbortSignal,
): Promise<never> => {
	await clock.sleep(ATTEMPT_TIMEOUT_MS, { signal });
	throw new Error("The TypeSafe API did not answer in time.");
};

/** `work`, or a throw after `ATTEMPT_TIMEOUT_MS`, because `HttpInit` has no timeout. The timer stops when `work` settles. */
const bounded = async <T>(work: Promise<T>, clock: JevClock): Promise<T> => {
	const stop = new AbortController();
	try {
		return await Promise.race([work, timeout(clock, stop.signal)]);
	} finally {
		stop.abort();
	}
};

/** The transport of `send`: `fetch` gets the `init` of one try, and `sleep` waits between tries. */
export interface Transport<B extends string | FormData> {
	readonly fetch: (
		url: string,
		init: {
			readonly method: string;
			readonly headers: Record<string, string>;
			readonly body: B;
		},
	) => Promise<JevReply>;
	readonly sleep: (ms: number) => Promise<unknown>;
}

/** The JSON reply to a request. The key goes only in the `authorization` header. A `FormData` body gets its content type, with the boundary, from `fetch`. It throws on a failure. */
export const send = <B extends string | FormData>(
	key: string,
	request: { readonly body: B; readonly headers: Record<string, string> },
	transport: Transport<B>,
): Promise<unknown> => {
	const headers = {
		authorization: `Bearer ${key}`,
		...(typeof request.body === "string" && {
			"content-type": "application/json",
		}),
		...request.headers,
	};
	return retried(
		() =>
			transport.fetch(JEV_API, { method: "POST", headers, body: request.body }),
		transport.sleep,
	);
};

/** The `answers` of the reply to `body`. It throws on a failure and on a timeout. `http` and `clock` are `$.http` and `$.clock` in the mod. */
export const postJev = async (
	key: string,
	body: object,
	http: JevHttp,
	clock: JevClock,
): Promise<unknown> => {
	const reply = await send(
		key,
		{ body: JSON.stringify(body), headers: {} },
		{
			fetch: (url, init) => bounded(http.fetch(url, init), clock),
			sleep: (ms) => clock.sleep(ms),
		},
	);
	return isRecord(reply) ? reply["answers"] : undefined;
};

export const isRecord = (x: unknown): x is Record<string, unknown> =>
	typeof x === "object" && x !== null;

/** A number from 0 to 1. */
export const isProbability = (x: unknown): x is number =>
	typeof x === "number" && x >= 0 && x <= 1;

/** P(yes) of the yes or no answer `name` in `answers`, or `undefined` when the answer is missing or not a probability. */
export const noulOf = (answers: unknown, name: string): number | undefined => {
	const answer = isRecord(answers) ? answers[name] : undefined;
	const p = isRecord(answer) ? answer["noul"] : undefined;
	return isProbability(p) ? p : undefined;
};
