import { expect, test } from "claude-code/testing";
import { postJev } from "./jev.ts";
import { questionsOfInput, replyOf, requestOf, verdictsOf } from "./judge.ts";

const STORE = {
	question: "Which store?",
	options: [
		{ label: "sql", description: "relations" },
		{ label: "kv", description: "keys" },
	],
};

const wire = (p: number, approval = 0.05, choice = "sql") => ({
	pick_0: { choice, probabilities: { sql: p, kv: 1 - p } },
	approval_0: { noul: approval },
});

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

test("a multi-select question and a question of one option are left out", () => {
	expect(
		requestOf([
			{ ...STORE, multiSelect: true },
			{ question: "Only?", options: [{ label: "a" }] },
		]),
	).toBeUndefined();
});

test("each question is keyed by its index, so equal texts stay two decisions", () => {
	expect(Object.keys(requestOf([STORE, STORE])?.questions ?? {})).toEqual([
		"pick_0",
		"approval_0",
		"pick_1",
		"approval_1",
	]);
});

const verdict = (p: number, approval?: number, choice?: string) =>
	verdictsOf([STORE], wire(p, approval, choice))[0];

test("a probability at the bar is returned", () => {
	expect(verdict(0.75)).toEqual({ kind: "pick", choice: "sql", p: 0.75 });
});

test("a probability under the bar is not", () => {
	expect(verdict(0.74)).toBeUndefined();
});

test("an approval that is not a confident no is not", () => {
	expect(verdict(0.95, 0.2)).toBeUndefined();
});

test("a choice that is no option is not", () => {
	expect(
		verdictsOf([STORE], {
			...wire(0.9),
			pick_0: { choice: "graph", probabilities: { graph: 0.9 } },
		})[0],
	).toBeUndefined();
});

test("a pick is named with its probability to two places", () => {
	const text = replyOf([STORE], verdictsOf([STORE], wire(0.9)));

	expect(text).toContain("sql");
	expect(text).toContain("0.90");
});

test("a failure gives no pick for any question", () => {
	expect(replyOf([STORE], "down")).not.toContain("picks");
});

const reply = (status: number, text = "{}") => ({
	status,
	ok: status < 300,
	text,
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
	expect(failure).toBeInstanceOf(Error);
});

test("a 401 is not tried again", async () => {
	let tries = 0;

	await postJev(
		"k",
		{},
		{
			fetch: async () => {
				tries += 1;
				return reply(401, "bad");
			},
			sleep: async () => undefined,
		},
	).catch(() => undefined);

	expect(tries).toBe(1);
});
