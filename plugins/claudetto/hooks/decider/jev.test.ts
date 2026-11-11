import { expect, test } from "claude-code/testing";

import { JevStatusError, postJev } from "./jev.ts";

const reply = (status: number, text = "{}") => ({
	status,
	ok: status < 300,
	text,
});

type Sleep = Parameters<typeof postJev>[2]["sleep"];

const recordingSleep =
	(waits: number[]): Sleep =>
	(ms, options) =>
		options === undefined
			? Promise.resolve(waits.push(ms))
			: new Promise((resolve) => {
					options.signal.addEventListener("abort", () => {
						resolve(0);
					});
				});

test("a 429 waits and tries again, up to three tries", async () => {
	const waits: number[] = [];
	let tries = 0;

	const failure = await postJev(
		"k",
		{},
		{
			fetch: () => {
				tries += 1;
				return Promise.resolve(reply(429));
			},
			sleep: recordingSleep(waits),
		},
	).catch((error: unknown) => error);

	expect(tries).toBe(3);
	expect(waits).toEqual([1000, 2000]);
	expect(failure).toBeInstanceOf(Error);
});

test("a 401 is not tried again", async () => {
	let tries = 0;

	await postJev(
		"k",
		{},
		{
			fetch: () => {
				tries += 1;
				return Promise.resolve(reply(401, "bad"));
			},
			sleep: () => Promise.resolve(0),
		},
	).catch(() => void 0);

	expect(tries).toBe(1);
});

test("a request that outlasts 5000 ms ends the try with no second request", async () => {
	const waits: number[] = [];
	let tries = 0;

	const failure = await postJev(
		"k",
		{},
		{
			fetch: () => {
				tries += 1;
				return Promise.withResolvers<never>().promise;
			},
			sleep: (ms) => {
				waits.push(ms);
				return Promise.resolve(0);
			},
		},
	).catch((error: unknown) => error);

	expect(waits).toEqual([5000]);
	expect(tries).toBe(1);
	expect(failure).toBeInstanceOf(Error);
});

test("a refusal carries its status and its body, and one try stops at the first 429", async () => {
	let tries = 0;

	const failure = await postJev(
		"k",
		{},
		{
			fetch: () => {
				tries += 1;
				return Promise.resolve(reply(429, "slow down"));
			},
			sleep: () => Promise.resolve(0),
		},
		1,
	).catch((error: unknown) => error);

	expect(tries).toBe(1);
	expect(failure).toBeInstanceOf(JevStatusError);
	expect(failure).toMatchObject({ status: 429, body: "slow down" });
});
