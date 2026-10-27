// The transport of `post` in `adapters/upload.ts`, which repeats the request flow of `postJev` in `domain/jev.ts`: the same request, the same retries, and a bound for each try.
// The API is a fake `fetch`, and the waits are a fake `sleep`, so no test sends a request or waits.

import { expect, test } from "bun:test";
import { post } from "../../../../plugins/claudetto/modules/jev/adapters/upload.ts";
import { JEV_API } from "../../../../plugins/claudetto/modules/jev/domain/jev.ts";
import {
	BACKOFF_MS,
	TRIES,
} from "../../../../plugins/claudetto/modules/jev/limits.ts";
import { BODY, fakeFetch, KEY, replies, reply, waits } from "./support.ts";

test("`post` posts to `JEV_API` with the key in the `authorization` header only", async () => {
	const seen: { url: string; init: RequestInit }[] = [];
	const fetchFn = fakeFetch(async (url, init) => {
		seen.push({ url: String(url), init: init ?? {} });
		return reply(200, { answers: { q: { noul: 0.9 } } });
	});

	const result = await post(BODY, KEY, { fetchFn });

	expect(result).toEqual({ answers: { q: { noul: 0.9 } } });
	expect(seen).toHaveLength(1);
	const [sent] = seen;
	expect(sent?.url).toBe(JEV_API);
	expect(sent?.init.method).toBe("POST");
	expect(sent?.init.headers).toMatchObject({ authorization: `Bearer ${KEY}` });
	expect(String(sent?.init.body)).not.toContain(KEY);
});

test("`post` gives each try a signal that has not fired, for the bound of a try", async () => {
	const signals: (AbortSignal | null | undefined)[] = [];
	const fetchFn = fakeFetch(async (_url, init) => {
		signals.push(init?.signal);
		return reply(200, { answers: 1 });
	});

	await post(BODY, KEY, { fetchFn });

	expect(signals[0]).toBeInstanceOf(AbortSignal);
	expect(signals[0]?.aborted).toBe(false);
});

test("`post` retries a 429 and a 529 with a doubling wait, and the third try answers", async () => {
	const { fetchFn, calls } = replies(
		reply(429),
		reply(529),
		reply(200, { answers: 1 }),
	);
	const { ms, sleep } = waits();

	const result = await post(BODY, KEY, { fetchFn, sleep });

	expect(result).toEqual({ answers: 1 });
	expect(calls.count).toBe(TRIES);
	expect(ms).toEqual([BACKOFF_MS, BACKOFF_MS * 2]);
});
