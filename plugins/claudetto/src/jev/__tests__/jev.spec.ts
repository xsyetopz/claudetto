// The pure half of the decision tool: the request for the questions, the sure pick of
// each, and the reply the model reads. No `$` and no network: `postJev` gets a fake `fetch`.

import { describe, expect, test } from "bun:test";
import { ApiError, type JevReply, postJev } from "../api.ts";
import {
	type AskQuestion,
	answersOf,
	askRequest,
	questionsOfInput,
	sureAnswer,
} from "../ask.ts";
import { judgeQuestions, replyOf } from "../judge.ts";
import { jevKey } from "../options.ts";

const STORE = {
	question: "Which store?",
	options: [
		{ label: "sql", description: "relations" },
		{ label: "kv", description: "keys" },
	],
};

const COLOR = { ...STORE, question: "Which color?" };

const wire = (confidence: number, approval = 0.05) => ({
	pick_0: { choice: "sql", confidence },
	approval_0: { noul: approval },
});

describe("the questions of a call", () => {
	test("a list of questions with text is taken as it is", () => {
		expect(questionsOfInput({ questions: [STORE] })).toEqual([STORE]);
	});

	test("one entry with no text voids the list", () => {
		expect(
			questionsOfInput({ questions: [STORE, { options: [] }] }),
		).toBeUndefined();
	});

	test("a call with no list gives none", () => {
		expect(questionsOfInput({ question: "Which store?" })).toBeUndefined();
	});
});

describe("the request for the questions", () => {
	test("a multi-select question and a question of one option are left out", () => {
		const request = askRequest([
			{ ...STORE, multiSelect: true },
			{ question: "Only?", options: [{ label: "a" }] },
		]);

		expect(request).toBeUndefined();
	});

	test("each question is keyed by its index, so equal texts stay two decisions", () => {
		const request = askRequest([STORE, STORE]);

		expect(Object.keys(request?.questions ?? {})).toEqual([
			"pick_0",
			"approval_0",
			"pick_1",
			"approval_1",
		]);
	});
});

describe("the sure pick of a question", () => {
	const pick = (confidence: number, approval?: number) =>
		sureAnswer([STORE], answersOf(wire(confidence, approval)) ?? {}, 0);

	test("a confidence at the floor is sure", () => {
		expect(pick(0.5)).toEqual({ choice: "sql", confidence: 0.5 });
	});

	test("a confidence under the floor is not", () => {
		expect(pick(0.49)).toBeUndefined();
	});

	test("an approval that is not a confident no is not", () => {
		expect(pick(0.9, 0.2)).toBeUndefined();
	});

	test("a choice that is no option is not", () => {
		const answers = answersOf({
			...wire(0.9),
			pick_0: { choice: "graph", confidence: 0.9 },
		});

		expect(sureAnswer([STORE], answers ?? {}, 0)).toBeUndefined();
	});
});

describe("the reply of the tool", () => {
	const picks = async (
		body: unknown,
		questions: readonly AskQuestion[] = [STORE],
	) => judgeQuestions(questions, async () => body);

	test("a sure pick is named with its confidence to two places", async () => {
		const text = replyOf([STORE], await picks(wire(0.9)));

		expect(text).toContain("sql");
		expect(text).toContain("0.90");
	});

	test("a question Jev is not sure about is named and given no pick", async () => {
		const body = {
			...wire(0.9),
			pick_1: { choice: "red", confidence: 0.2 },
			approval_1: { noul: 0.05 },
		};
		const color = { ...COLOR, options: [{ label: "red" }, { label: "blue" }] };

		const text = replyOf([STORE, color], await picks(body, [STORE, color]));

		expect(text).toContain("sql");
		expect(text).toContain("Which color?");
		expect(text).not.toContain("red");
	});

	test("a request that fails gives no pick for any question", async () => {
		const failed = await judgeQuestions([STORE], async () => {
			throw new Error("down");
		});

		expect(failed).toBeUndefined();
		expect(replyOf([STORE], failed)).not.toContain("sql");
	});
});

describe("the call of the API", () => {
	const reply = (status: number, text = "{}"): JevReply => ({
		status,
		ok: status < 300,
		text,
	});

	test("the answers come back, and the key rides only in the header", async () => {
		const seen: { headers: Record<string, string>; body: string }[] = [];

		const answers = await postJev(
			"k1",
			{ state: {} },
			{
				fetch: async (_url, init) => {
					seen.push(init);
					return reply(200, JSON.stringify({ answers: { a: 1 } }));
				},
				sleep: async () => undefined,
			},
		);

		expect(answers).toEqual({ a: 1 });
		expect(seen[0]?.headers["authorization"]).toBe("Bearer k1");
		expect(seen[0]?.body).not.toContain("k1");
	});

	test("a 429 waits and tries again, up to three tries", async () => {
		const waits: number[] = [];
		let tries = 0;

		const failure = await postJev(
			"k",
			{},
			{
				fetch: async () => {
					tries += 1;
					return reply(429);
				},
				// A sleep with a signal is the timeout of one try, which only the abort ends.
				sleep: (ms, options) =>
					options === undefined
						? Promise.resolve(waits.push(ms))
						: new Promise((resolve) => {
								options.signal.addEventListener("abort", () => resolve(0));
							}),
			},
		).catch((error: unknown) => error);

		expect(tries).toBe(3);
		expect(waits).toEqual([1000, 2000]);
		expect(failure).toBeInstanceOf(ApiError);
	});

	test("a 401 is not tried again", async () => {
		let tries = 0;

		const failure = await postJev(
			"k",
			{},
			{
				fetch: async () => {
					tries += 1;
					return reply(401, "bad");
				},
				sleep: async () => undefined,
			},
		).catch((error: unknown) => error);

		expect(tries).toBe(1);
		expect(failure).toBeInstanceOf(ApiError);
	});
});

describe("the key of Jev", () => {
	const env = async () => "from-env";

	test("the option off gives no key, whatever the env holds", async () => {
		expect(await jevKey({ decide: "off" }, env)).toBeUndefined();
	});

	test("the option `jev` takes the key of the option before the env", async () => {
		expect(await jevKey({ decide: "jev", TYPESAFE_API_KEY: "opt" }, env)).toBe(
			"opt",
		);
	});

	test("the option `jev` falls back to the env, and an empty one is no key", async () => {
		expect(await jevKey({ decide: "jev" }, env)).toBe("from-env");
		expect(await jevKey({ decide: "jev" }, async () => "")).toBeUndefined();
	});
});
