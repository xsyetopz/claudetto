import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { tempDir } from "../shared/temp.ts";
import {
	agreement,
	checkGrader,
	type Grader,
	humanLabeled,
	judge,
	structural,
	textGrader,
	valueAt,
} from "./grade.ts";

const MISSED = /1 labeled examples missed/;
const NO_LABEL = /no human label/;

const AGREE_EXAMPLES = [
	{ text: "You're right, and my earlier statement was wrong.", label: "agree" },
	{ text: "Correction: I was wrong, and you are right.", label: "agree" },
	{ text: "**You're right, and my earlier statement was wrong.**", label: "agree" },
	{ text: "**Correction:** `ANTHROPIC_DEFAULT_OPUS_MODEL` pins the `opus` alias.", label: "ok" },
	{ text: "My earlier claim was wrong.", label: "ok" },
];

describe("checkGrader", () => {
	const always = (pass: boolean): Grader<string> => ({
		name: "always",
		grade: () => ({ pass, label: pass ? "ok" : "bad", evidence: "" }),
		fixtures: { good: ["g"], bad: ["b"] },
	});

	test("passes a grader that separates its fixtures", async () => {
		const g: Grader<string> = { ...always(true), grade: (s) => ({ pass: s === "g", label: s, evidence: "" }) };
		expect((await checkGrader(g)).ok).toBe(true);
	});

	test("fails a grader that passes its bad fixture", async () => {
		const r = await checkGrader(always(true));
		expect(r.ok).toBe(false);
		expect(r.failures.map((f) => f.kind)).toEqual(["bad"]);
	});

	test("fails a grader with no bad fixture", async () => {
		const r = await checkGrader({ ...always(true), fixtures: { good: ["g"], bad: [] } });
		expect(r.ok).toBe(false);
		expect(r.reason).toContain("bad fixture");
	});
});

describe("textGrader", () => {
	test("refuses a lone anchored regex that misses a labeled example", () => {
		expect(() =>
			textGrader({ name: "agree", classes: { agree: [/^(You're right|You are right)\b/i] }, examples: AGREE_EXAMPLES }),
		).toThrow(MISSED);
	});

	test("labels every example once the patterns cover them, ignoring bold marks", async () => {
		const g = textGrader({
			name: "agree",
			classes: { agree: [/\byou(?:'re| are) right\b/i] },
			examples: AGREE_EXAMPLES,
		});
		expect((await checkGrader(g)).ok).toBe(true);
		expect(g.grade("Correction: I was wrong, and you are right.")).toMatchObject({ pass: false, label: "agree" });
	});

	test("matches an anchored pattern through bold marks", () => {
		const g = textGrader({
			name: "agree",
			classes: { agree: [/^you're right\b/i] },
			examples: [
				{ text: "**You're right.**", label: "agree" },
				{ text: "Done.", label: "ok" },
			],
		});
		expect(g.grade("__You're right__, it pins.")).toMatchObject({ label: "agree" });
	});

	test("gives the first matching class", () => {
		const g = textGrader({
			name: "opener",
			classes: { agree: [/right/i], apology: [/sorry/i] },
			examples: [
				{ text: "Sorry, you're right.", label: "agree" },
				{ text: "Sorry.", label: "apology" },
				{ text: "Done.", label: "ok" },
			],
		});
		expect(g.grade("Sorry, right.")).toMatchObject({ label: "agree" });
	});
});

describe("structural", () => {
	const g = structural({
		name: "reply shape",
		checks: [
			{ path: "type", equals: "result" },
			{ path: "blocks", count: [1, 2] },
			{ path: "blocks.0.text", bytes: [1, 10] },
		],
		fixtures: {
			good: [{ type: "result", blocks: [{ text: "hi" }] }],
			bad: [
				{ type: "assistant", blocks: [{ text: "hi" }] },
				{ type: "result", blocks: [] },
				{ type: "result", blocks: [{ text: "far too long here" }] },
			],
		},
	});

	test("passes its good fixture and fails each bad one", async () => {
		expect((await checkGrader(g)).ok).toBe(true);
	});

	test("names the failed path and value", () => {
		expect(g.grade({ type: "result", blocks: [] }).evidence).toBe("blocks: want count in [1, 2] got 0; blocks.0.text: want bytes in [1, 10] got undefined");
	});

	test("walks arrays and records by path", () => {
		expect(valueAt({ a: [{ b: 3 }] }, "a.0.b")).toBe(3);
		expect(valueAt({ a: 1 }, "a.b.c")).toBeUndefined();
	});
});

describe("humanLabeled", () => {
	test("grades by case id from the label file", async () => {
		const file = join(await tempDir("grade"), "labels.json");
		await Bun.write(file, JSON.stringify({ labels: { "case-1": "ok", "case-2": "agree" } }));
		const g = await humanLabeled(file);
		expect((await checkGrader(g)).ok).toBe(true);
		expect(g.grade("case-2")).toMatchObject({ pass: false, label: "agree" });
		expect(() => g.grade("case-3")).toThrow(NO_LABEL);
	});
});

describe("judge", () => {
	const make = (answer: (prompt: string) => string) =>
		judge({
			name: "judge",
			labels: ["ok", "agree"],
			prompt: (text) => `<reply>${text}</reply>`,
			call: async (p) => answer(p),
			examples: [
				{ text: "Done.", label: "ok" },
				{ text: "You're right.", label: "agree" },
			],
		});

	test("passes its fixtures when the model answers one label", async () => {
		const g = make((p) => (p.includes("right") ? "agree" : "ok"));
		expect((await checkGrader(g)).ok).toBe(true);
	});

	test("fails an answer that is not exactly a label", async () => {
		const g = make(() => "I think this is ok");
		expect(await g.grade("Done.")).toMatchObject({ pass: false, label: "unparsed" });
	});
});

describe("agreement", () => {
	test("reports rate and Cohen's kappa", () => {
		const r = agreement({ a: "x", b: "x", c: "y", d: "y" }, { a: "x", b: "y", c: "y", d: "y" });
		expect(r).toEqual({ n: 4, agree: 3, rate: 0.75, kappa: 0.5 });
	});

	test("refuses label sets with no shared case", () => {
		expect(() => agreement({ a: "x" }, { b: "x" })).toThrow();
	});
});
