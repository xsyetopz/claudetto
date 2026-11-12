import { expect, test } from "claude-code/testing";

import {
	bodyOf,
	haikuText,
	jevAnswers,
	noul,
	rig,
} from "../../decider/decider.mock";
import type { PinConstraint } from "../../texts-pin";
import { isRecord } from "../../tools";
import { readLedger } from "./pin-ledger";

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

/** Jev's answers for `sentences` sentences and `entries` entries: no limit and nothing lifted, with `given` over them. */
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
				...Object.fromEntries(
					numbers(entries).map((j) => [`lifts_${j}`, noul(0.1)]),
				),
				...given,
			}),
	});

const LEAVE: PinConstraint = {
	text: "Leave alone package.json.",
	rule: "none",
};

test("A Stated Constraint: the limiting sentence becomes the entry, word for word, and the other sentence does not", async () => {
	const message = "Run the tests. Nothing should change on disk.";
	const { $, fetches, asked } = jev(2, 0, {
		restricts_2: noul(0.9),
		rule_2: picked("read-only"),
	});

	const ledger = await readLedger($, [], message, []);

	expect(ledger).toEqual([
		{ text: "Nothing should change on disk.", rule: "read-only" },
	]);
	expect(sent(fetches, "state")).toEqual({
		message,
		sentences: "1. Run the tests.\n2. Nothing should change on disk.",
	});
	expect(Object.keys(sent(fetches, "questions"))).toEqual([
		"restricts_1",
		"rule_1",
		"restricts_2",
		"rule_2",
	]);
	expect(asked).toHaveLength(0);
});

test("Only Files with a Path: the entry's files are the paths its sentence names", async () => {
	const { $ } = jev(1, 0, {
		restricts_1: noul(0.9),
		rule_1: picked("only-files"),
	});

	const ledger = await readLedger(
		$,
		[],
		"Only edit `src/config.ts` and bun.lock.",
		[],
	);

	expect(ledger).toMatchObject([
		{ rule: "only-files", files: ["src/config.ts", "bun.lock"] },
	]);
});

test("Only Files with No Path: an abbreviation is no path, so the entry has rule none", async () => {
	const { $ } = jev(1, 0, {
		restricts_1: noul(0.9),
		rule_1: picked("only-files"),
	});

	const ledger = await readLedger(
		$,
		[],
		"Only edit the config, e.g. v1.2.",
		[],
	);

	expect(ledger).toMatchObject([{ rule: "none" }]);
	expect(ledger[0]?.files).toBeUndefined();
});

test("A Limit with No Settled Rule: the entry has rule none", async () => {
	const { $ } = jev(1, 0, {
		restricts_1: noul(0.9),
		rule_1: picked("read-only", 0.5),
	});

	const ledger = await readLedger($, [], "Do not touch the lockfile.", []);

	expect(ledger).toMatchObject([
		{ text: "Do not touch the lockfile.", rule: "none" },
	]);
});

test("A Sentence Not Settled: an answer in the band goes to the fallback, and with no answer there the ledger gains no entry", async () => {
	const { $, asked } = jev(1, 0, { restricts_1: noul(0.5) });

	const ledger = await readLedger($, [], "The lockfile is fine as it is.", []);

	expect(ledger).toEqual([]);
	expect(asked).toHaveLength(1);
});

test("Lifted by the Person: a yes to an entry's `lifts` question removes it, and the others stay", async () => {
	const stays: PinConstraint = { text: "Do not push.", rule: "no-push" };
	const { $, fetches } = jev(1, 2, { lifts_1: noul(0.9) });

	const ledger = await readLedger($, [], "commit those", [LEAVE, stays]);

	expect(ledger).toEqual([stays]);
	expect(sent(fetches, "state")).toEqual({
		message: "commit those",
		sentences: "1. commit those",
		entries: "1. Leave alone package.json.\n2. Do not push.",
	});
});

test("Failed Extraction: with no key and no answer from the fallback, the ledger stays", async () => {
	const { $, fetches, asked } = rig({ env: {} });

	const ledger = await readLedger($, [], "Do not push.", [LEAVE]);

	expect(ledger).toEqual([LEAVE]);
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
				}),
			),
	});

	const ledger = await readLedger($, [], "Do not push.", []);

	expect(ledger).toMatchObject([{ text: "Do not push.", rule: "no-push" }]);
});

test("The First Call of a Process: the earlier messages' sentences are asked about too, and `message` stays the latest", async () => {
	const { $, fetches } = jev(3, 0, {
		restricts_1: noul(0.9),
		rule_1: picked("no-push"),
	});

	const ledger = await readLedger(
		$,
		["Do not push. Fix the build."],
		"Go on.",
		[],
	);

	expect(ledger).toMatchObject([{ text: "Do not push.", rule: "no-push" }]);
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

	const ledger = await readLedger($, ["Do not push."], "Do not push.", []);

	expect(ledger).toHaveLength(1);
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
