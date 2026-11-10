import { expect, test } from "claude-code/testing";

import { JEV_GIVE_BACK } from "../texts-gate.ts";
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

const keysOf = (request: ReturnType<typeof requestOf>): string[] =>
	request === undefined ? [] : Object.keys(request.questions);

test("each question is keyed by its index, so equal texts stay two decisions", () => {
	expect(keysOf(requestOf([STORE, STORE]))).toEqual([
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
	expect(replyOf([STORE], "down")).toContain(JEV_GIVE_BACK);
});

const SHIP = { question: "Ship it?" };

const APPROVAL = () => ({
	type: "noul",
	instructions: expect.any(String),
});

test("the request sends the texts, the fixed prompts, and a label where a description is empty", () => {
	expect(
		requestOf([
			{
				question: "Which store?",
				options: [{ label: "sql", description: "relations" }, { label: "kv" }],
			},
			SHIP,
		]),
	).toEqual({
		state: {
			question_0: {
				question: "Which store?",
				options: { sql: "relations", kv: "" },
			},
			question_1: { question: "Ship it?" },
		},
		questions: {
			pick_0: {
				type: "choice",
				instructions: expect.any(String),
				criteria: { sql: "relations", kv: "kv" },
			},
			approval_0: APPROVAL(),
			yes_1: {
				type: "noul",
				instructions: expect.any(String),
			},
			approval_1: APPROVAL(),
		},
	});
});

const yesNo = (noul: number, approval: unknown = 0.05) =>
	verdictsOf([SHIP], { yes_0: { noul }, approval_0: { noul: approval } })[0];

test("a yes/no question is yes at 0.7, no at 0.3 with the odds turned, and back between", () => {
	expect(yesNo(0.7)).toEqual({ kind: "yes", p: 0.7 });
	expect(yesNo(0.1)).toEqual({ kind: "no", p: 0.9 });
	expect(yesNo(0.3)?.kind).toBe("no");
	expect(yesNo(0.5)).toBeUndefined();
});

test("a yes/no question with no answer is not answered", () => {
	expect(verdictsOf([SHIP], { approval_0: { noul: 0.05 } })[0]).toBeUndefined();
});

test("a probability outside 0 to 1 or not a number is no answer", () => {
	expect(yesNo(1)).toEqual({ kind: "yes", p: 1 });
	expect(yesNo(0)).toEqual({ kind: "no", p: 1 });
	expect(yesNo(1.5)).toBeUndefined();
	expect(yesNo(-0.5)).toBeUndefined();
	expect(yesNo(0.9, "0.05")).toBeUndefined();
	expect(yesNo(0.9, -0.5)).toBeUndefined();
	expect(yesNo(0.9, 1.5)).toBeUndefined();
	expect(yesNo(0.9, 0)).toEqual({ kind: "yes", p: 0.9 });
	expect(verdict(1)).toEqual({ kind: "pick", choice: "sql", p: 1 });
	expect(verdict(1.5)).toBeUndefined();
});

test("a pick with no probabilities, or no answer at all, is not made", () => {
	const approval_0 = { noul: 0.05 };

	expect(
		verdictsOf([STORE], { pick_0: { choice: "sql" }, approval_0 })[0],
	).toBeUndefined();
	expect(verdictsOf([STORE], { approval_0 })[0]).toBeUndefined();
});

test("a pick with no approval answer is not made", () => {
	expect(verdictsOf([STORE], { pick_0: wire(0.9).pick_0 })[0]).toBeUndefined();
});

test("a multi-select question is not decided even when answered", () => {
	expect(
		verdictsOf([{ ...STORE, multiSelect: true }], wire(0.9))[0],
	).toBeUndefined();
});

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
