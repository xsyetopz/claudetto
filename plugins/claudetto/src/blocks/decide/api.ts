// No `$`: `fetch` and `sleep` come from the caller, so a test passes plain values.

import {
	ATTEMPT_TIMEOUT_MS,
	BACKOFF_MS,
	ERROR_BODY_MAX,
	TRIES,
} from "./limits.ts";

export const JEV_API = "https://api.typesafe.ai/v1/systemone";
export const JEV_MODEL = "jev-latest";

export class ApiError extends Error {
	readonly status: number;

	constructor(status: number, message: string) {
		super(message);
		this.status = status;
	}
}

export interface JevReply {
	readonly status: number;
	readonly ok: boolean;
	readonly text: string;
}

export type JevFetch = (
	url: string,
	init: {
		readonly method: string;
		readonly headers: Record<string, string>;
		readonly body: string;
	},
) => Promise<JevReply>;

export type JevSleep = (
	ms: number,
	options?: { readonly signal: AbortSignal },
) => Promise<unknown>;

/** Non-null object; an array passes too, so a plain-record caller checks fields itself. */
export const isRecord = (x: unknown): x is Record<string, unknown> =>
	typeof x === "object" && x !== null;

export const isProbability = (x: unknown): x is number =>
	typeof x === "number" && x >= 0 && x <= 1;

export const jevBody = (state: object, questions: object) => ({
	state,
	model: JEV_MODEL,
	questions,
});

/** A 429 or 529 waits `BACKOFF_MS`, doubled per retry, up to `TRIES` tries. */
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

const timeout = async (
	sleep: JevSleep,
	signal: AbortSignal,
): Promise<never> => {
	await sleep(ATTEMPT_TIMEOUT_MS, { signal });
	throw new Error("The TypeSafe API did not answer in time.");
};

/** `HttpInit` has no timeout, so the work is raced against `ATTEMPT_TIMEOUT_MS`. */
const bounded = async <T>(work: Promise<T>, sleep: JevSleep): Promise<T> => {
	const stop = new AbortController();
	try {
		return await Promise.race([work, timeout(sleep, stop.signal)]);
	} finally {
		stop.abort();
	}
};

/** The key goes only in the `authorization` header. */
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
