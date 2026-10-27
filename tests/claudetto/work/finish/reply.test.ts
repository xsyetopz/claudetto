// The fixtures of the rules of `stop`: each known-bad reply of `research/incidents.md` sets one note, and each known-good reply sets none.
// A reply with "..." in the incident table is written out here with the words of the table.

import { expect, test } from "bun:test";
import {
	claimsDone,
	deferredItem,
} from "../../../../plugins/claudetto/modules/work/finish/domain/reply.ts";

/** Known-bad replies by row of `research/incidents.md`, with a word that the note must name. */
const BAD: [row: number, reply: string, names: string][] = [
	[
		1,
		"Done with the parser.\n\nFollow-ups: the three renamed helpers.",
		"Follow-ups",
	],
	[2, "Follow-ups: the cache key. It needs no change.", "Follow-ups"],
	[
		6,
		"Not done: the side check. I deleted its temp folder without rerunning it.",
		"side check",
	],
	[7, "The record can carry 5 more keys whose types weren't traced.", "types"],
	[8, "Follow-ups: the probes have not been run on 2.1.308.", "probes"],
	[10, "Still open: 11.1, your test sessions with the alpha.", "11.1"],
	[
		11,
		"23.8 (wiki screenshots) also waits for your capture run.",
		"screenshots",
	],
	[12, "Follow-up, not part of this task: 67 worktrees.", "67 worktrees"],
	[
		13,
		"Not mine: commitlint.yml has an uncommitted Bun bump.",
		"commitlint.yml",
	],
];

for (const [row, reply, names] of BAD) {
	test(`the fixture of row ${row} of the incident table sets a note that names the item`, () => {
		expect(deferredItem(reply)).toContain(names);
	});
}

const GOOD: [name: string, reply: string][] = [
	[
		"a sandbox deny with the exact command",
		"Not done: the stop of the old processes. The sandbox denied `pkill`, so run `! pkill -f old-server`.",
	],
	[
		"a blocked step by a permission check",
		"Still open: the push. The permission check blocked it.",
	],
	["a finished change", "The parser now reads `a.ts` and the tests pass."],
	[
		"a deferral in a code fence",
		"Output:\n```\nNot done: x\n```\nAll steps ran.",
	],
];

for (const [name, reply] of GOOD) {
	test(`${name} sets no deferral note`, () => {
		expect(deferredItem(reply)).toBeNull();
	});
}

test("an item is cut to the bound", () => {
	expect(deferredItem(`Not done: ${"x".repeat(300)}`)?.length).toBe(80);
});

test("`ready` and `done` are a claim, and `not done` is none", () => {
	expect(
		claimsDone("`0.3.0-alpha.1` is ready to publish: All 47 tasks checked."),
	).toBe(true);
	expect(claimsDone("Done.")).toBe(true);
	expect(claimsDone("The change is not done yet.")).toBe(false);
	expect(claimsDone("I fixed the parser.")).toBe(false);
});
