import { expect, test } from "claude-code/testing";

import {
	bodyOf,
	haikuText,
	jevAnswers,
	noul,
	rig,
} from "./decider/decider.mock.ts";
import { readLedger } from "./pin-ledger.ts";
import type { PinConstraint } from "./texts-handoff.ts";
import { isRecord } from "./tools.ts";

const numbers = (n: number) => Array.from({ length: n }, (_, i) => i + 1);

/** One part of the first request to Jev: its `state` or its `questions`. */
const sent = (
	fetches: readonly Parameters<typeof bodyOf>[0][],
	part: string,
): Record<string, unknown> => {
	const value = bodyOf(fetches[0])[part];
	return isRecord(value) ? value : {};
};

const picked = (choice: string, p = 0.9) => ({
	type: "choice",
	choice,
	probabilities: { [choice]: p },
});

/** Jev's answers for `sentences` sentences and `entries` entries: no limit, a task, and nothing lifted, with `given` over them. */
const jev = (sentences: number, entries: number, given: object = {}) =>
	rig({
		jev: () =>
			jevAnswers({
				...Object.fromEntries(
					numbers(sentences).flatMap((i): [string, object][] => [
						[`restricts_${i}`, noul(0.1)],
						[`rule_${i}`, picked("read-only", 0.2)],
					]),
				),
				kind: picked("task"),
				...Object.fromEntries(
					numbers(entries).map((j) => [`lifts_${j}`, noul(0.1)]),
				),
				...given,
			}),
	});

const LEAVE: PinConstraint = {
	text: "Leave alone package.json.",
	rule: "none",
	quote: "Leave alone package.json.",
};

test("A Stated Constraint: the limiting sentence becomes the entry, word for word, and the other sentence does not", async () => {
	const message = "Run the tests. Nothing should change on disk.";
	const { $, fetches, asked } = jev(2, 0, {
		restricts_2: noul(0.9),
		rule_2: picked("read-only"),
	});

	const read = await readLedger($, [], message, []);

	expect(read).toEqual({
		kind: "task",
		ledger: [
			{
				text: "Nothing should change on disk.",
				rule: "read-only",
				quote: "Nothing should change on disk.",
			},
		],
	});
	expect(sent(fetches, "state")).toEqual({
		message,
		sentences: "1. Run the tests.\n2. Nothing should change on disk.",
	});
	expect(Object.keys(sent(fetches, "questions"))).toEqual([
		"restricts_1",
		"rule_1",
		"restricts_2",
		"rule_2",
		"kind",
	]);
	expect(asked).toHaveLength(0);
});

test("Only Files with a Path: the entry's files are the paths its sentence names", async () => {
	const { $ } = jev(1, 0, {
		restricts_1: noul(0.9),
		rule_1: picked("only-files"),
	});

	const read = await readLedger(
		$,
		[],
		"Only edit `src/config.ts` and bun.lock.",
		[],
	);

	expect(read.ledger).toMatchObject([
		{ rule: "only-files", files: ["src/config.ts", "bun.lock"] },
	]);
});

test("Only Files with No Path: an abbreviation is no path, so the entry has rule none", async () => {
	const { $ } = jev(1, 0, {
		restricts_1: noul(0.9),
		rule_1: picked("only-files"),
	});

	const read = await readLedger($, [], "Only edit the config, e.g. v1.2.", []);

	expect(read.ledger).toMatchObject([{ rule: "none" }]);
	expect(read.ledger[0]?.files).toBeUndefined();
});

test("A Limit with No Settled Rule: the entry has rule none", async () => {
	const { $ } = jev(1, 0, {
		restricts_1: noul(0.9),
		rule_1: picked("read-only", 0.5),
	});

	const read = await readLedger($, [], "Do not touch the lockfile.", []);

	expect(read.ledger).toMatchObject([
		{ text: "Do not touch the lockfile.", rule: "none" },
	]);
});

test("A Sentence Not Settled: an answer in the band goes to the fallback, and with no answer there the ledger gains no entry", async () => {
	const { $, asked } = jev(1, 0, { restricts_1: noul(0.5) });

	const read = await readLedger($, [], "The lockfile is fine as it is.", []);

	expect(read.ledger).toEqual([]);
	expect(asked).toHaveLength(1);
});

test("Lifted by the Person: a yes to an entry's `lifts` question removes it, and the others stay", async () => {
	const stays: PinConstraint = {
		text: "Do not push.",
		rule: "no-push",
		quote: "Do not push.",
	};
	const { $, fetches } = jev(1, 2, { lifts_1: noul(0.9) });

	const read = await readLedger($, [], "commit those", [LEAVE, stays]);

	expect(read.ledger).toEqual([stays]);
	expect(sent(fetches, "state")).toEqual({
		message: "commit those",
		sentences: "1. commit those",
		entries: "1. Leave alone package.json.\n2. Do not push.",
	});
});

for (const [scenario, p, kind] of [
	["Remark", 0.9, "remark"],
	["A Class Not Settled", 0.5, "task"],
] as const) {
	test(`${scenario}: a remark at ${p} is a ${kind}`, async () => {
		const { $ } = jev(1, 0, { kind: picked("remark", p) });

		const read = await readLedger($, [], "Who told you to lint the docs?", []);

		expect(read.kind).toBe(kind);
	});
}

test("Failed Extraction: with no key and no answer from the fallback, the ledger stays and the message is a task", async () => {
	const { $, fetches, asked } = rig({ env: {} });

	const read = await readLedger($, [], "Do not push.", [LEAVE]);

	expect(read).toEqual({ kind: "task", ledger: [LEAVE] });
	expect(fetches).toHaveLength(0);
	expect(asked).toHaveLength(1);
});

test("the fallback's yes stands when its evidence is words of the sentence", async () => {
	const { $ } = rig({
		env: {},
		haiku: () =>
			haikuText(
				JSON.stringify({
					restricts_1: { answer: "yes", evidence: "Do not push" },
					rule_1: { answer: "no-push", evidence: "Do not push" },
					kind: { answer: "task", evidence: "Do not push" },
				}),
			),
	});

	const read = await readLedger($, [], "Do not push.", []);

	expect(read.ledger).toMatchObject([
		{ text: "Do not push.", rule: "no-push" },
	]);
});

test("The First Call of a Process: the earlier messages' sentences are asked about too, and `message` stays the latest", async () => {
	const { $, fetches } = jev(3, 0, {
		restricts_1: noul(0.9),
		rule_1: picked("no-push"),
	});

	const read = await readLedger(
		$,
		["Do not push. Fix the build."],
		"Go on.",
		[],
	);

	expect(read.ledger).toMatchObject([
		{ text: "Do not push.", rule: "no-push" },
	]);
	expect(sent(fetches, "state")).toEqual({
		message: "Go on.",
		sentences: "1. Do not push.\n2. Fix the build.\n3. Go on.",
	});
});

test("a sentence the person repeats makes one entry", async () => {
	const { $ } = jev(2, 0, {
		restricts_1: noul(0.9),
		restricts_2: noul(0.9),
	});

	const read = await readLedger($, ["Do not push."], "Do not push.", []);

	expect(read.ledger).toHaveLength(1);
});

test("a message past 41 sentences keeps its first 20 and its last 21, and one log line holds its count", async () => {
	const message = Array.from({ length: 50 }, (_, i) => `Line ${i + 1}.`).join(
		" ",
	);
	const { $, fetches, logs } = jev(41, 0);

	await readLedger($, [], message, []);

	const sentences = String(sent(fetches, "state")["sentences"]);
	expect(sentences.split("\n")).toHaveLength(41);
	expect(sentences).toContain("20. Line 20.\n21. Line 30.");
	expect(sentences).toContain("41. Line 50.");
	expect(logs).toEqual([
		"A message holds 50 sentences, and the ledger reads the first 20 and the last 21.",
	]);
});
