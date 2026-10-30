// The call of the TypeSafe API: the model, the retry on 429 and 529, and the timeout of one try.
// No `$` here. A function gets the `fetch` and the `sleep` of its caller, so a test gives plain values.

import {
	ATTEMPT_TIMEOUT_MS,
	BACKOFF_MS,
	ERROR_BODY_MAX,
	TRIES,
} from "./limits.ts";

/** The endpoint that `jevBody` is posted to, on the TypeSafe API host. */
export const JEV_API = "https://api.typesafe.ai/v1/systemone";
/** The `model` field of every request body, set by `jevBody`. */
export const JEV_MODEL = "jev-latest";

/** Thrown for a reply that is not `ok` and is not retried, or that is still a 429 or a 529 on the last try. `status` is its HTTP status. */
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

/** `$.http.fetch` as the call uses it. */
export type JevFetch = (
	url: string,
	init: {
		readonly method: string;
		readonly headers: Record<string, string>;
		readonly body: string;
	},
) => Promise<JevReply>;

/** `$.clock.sleep` as the call uses it. */
export type JevSleep = (
	ms: number,
	options?: { readonly signal: AbortSignal },
) => Promise<unknown>;

/** Narrows to a non-null object; an array passes too, so a caller that needs a plain record checks the fields itself. */
export const isRecord = (x: unknown): x is Record<string, unknown> =>
	typeof x === "object" && x !== null;

/** A number from 0 to 1. */
export const isProbability = (x: unknown): x is number =>
	typeof x === "number" && x >= 0 && x <= 1;

/** The request body for a state and named questions. */
export const jevBody = (state: object, questions: object) => ({
	state,
	model: JEV_MODEL,
	questions,
});

/** The JSON of the first `ok` reply of `once`. A 429 or a 529 waits `BACKOFF_MS`, doubled for each retry, up to `TRIES` tries. */
const retried = (
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
	sleep: JevSleep,
	signal: AbortSignal,
): Promise<never> => {
	await sleep(ATTEMPT_TIMEOUT_MS, { signal });
	throw new Error("The TypeSafe API did not answer in time.");
};

/** `work`, or a throw after `ATTEMPT_TIMEOUT_MS`, because `HttpInit` has no timeout. The timer stops when `work` settles. */
const bounded = async <T>(work: Promise<T>, sleep: JevSleep): Promise<T> => {
	const stop = new AbortController();
	try {
		return await Promise.race([work, timeout(sleep, stop.signal)]);
	} finally {
		stop.abort();
	}
};

/**
 * The `answers` of the reply to `body`. The key goes only in the `authorization` header. It throws
 * on a failure and on a timeout. `fetch` and `sleep` are `$.http.fetch` and `$.clock.sleep`.
 */
export const postJev = async (
	key: string,
	body: object,
	transport: { readonly fetch: JevFetch; readonly sleep: JevSleep },
): Promise<unknown> => {
	const headers = {
		authorization: `Bearer ${key}`,
		"content-type": "application/json",
	};
	const payload = JSON.stringify(body);
	const reply = await retried(
		() =>
			bounded(
				transport.fetch(JEV_API, { method: "POST", headers, body: payload }),
				transport.sleep,
			),
		(ms) => transport.sleep(ms),
	);
	return isRecord(reply) ? reply["answers"] : undefined;
};
