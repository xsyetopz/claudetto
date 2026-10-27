// The text of `minispec status` against `openspec status` 1.15.0: the checklist has the same shape.
// The `Next:` line differs on purpose, because `minispec` names a skill and not an `openspec` command.

import { expect, test } from "bun:test";
import { OPENSPEC_RUN_TIMEOUT_MS } from "../../../../tools/limits.ts";
import {
	minispec,
	openspec,
	SAMPLE_CHANGES,
	sampleProject,
} from "../../../support/openspec.ts";

const CHANGE_LINE = /^(Change root:|Next:|- Loading)/;

/** The lines of the checklist: all but the path of the change root and the `Next:` line. */
const checklist = (out: string): string[] =>
	out
		.split("\n")
		.map((l) => l.trim())
		.filter((l) => l && !CHANGE_LINE.test(l));

/** Runs `args` with both tools on the sample project, and gives the results of both. */
const runBoth = async (args: string[]) => {
	const root = await sampleProject(["story", "task", "epic"]);
	const os = await openspec(root, args);
	const ms = await minispec(root, args);
	return { os, ms };
};

test.each(Object.values(SAMPLE_CHANGES))(
	"`status` of %s has the checklist of OpenSpec",
	async (change) => {
		const { os, ms } = await runBoth(["status", "--change", change]);
		expect(ms.code).toBe(os.code);
		expect(checklist(ms.out)).toEqual(checklist(os.out));
		expect(ms.out).not.toStartWith("{");
	},
	OPENSPEC_RUN_TIMEOUT_MS,
);

test(
	"`status --all` has the checklist of each change as OpenSpec has it",
	async () => {
		const { os, ms } = await runBoth(["status", "--all"]);
		expect(ms.code).toBe(os.code);
		expect(checklist(ms.out)).toEqual(checklist(os.out));
	},
	OPENSPEC_RUN_TIMEOUT_MS,
);
