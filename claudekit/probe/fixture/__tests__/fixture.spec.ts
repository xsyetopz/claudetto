// The fixture has to let a fork cross a compaction threshold. The round of 2026-10-29 measured that it
// did not: a fork peaked at 80,949 tokens from a base of 76,546, about 250 tokens a turn of its own
// growth, against the 100,000 of the lower arm. So the growth now comes from notes the base never
// reads, one per fork task, and the planted constraints come after them.

import { beforeAll, describe, expect, test } from "bun:test";
import { mkdtemp, readdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
	brokenIn,
	buildFixture,
	codeOf,
	FORK_NOTES,
	LAST_TASK,
	LATER,
	notesFor,
	TASKS_FILE,
} from "../fixture.ts";

/** The least characters of a note that is meant to be about 12,850 tokens, at 1.9 characters a token. */
const NOTE_CHARS = 20_000;

/** An open task line of the list, which carries its number. */
const OPEN_TASK = /^- \[ ] (1\.\d+)/;

let dir = "";
let lines: string[] = [];

beforeAll(async () => {
	dir = await mkdtemp(path.join(tmpdir(), "probe-fixture-"));
	await buildFixture(dir, 30_000);
	const text = await readFile(path.join(dir, TASKS_FILE), "utf8");
	lines = text.split("\n").filter((line) => OPEN_TASK.test(line));
});

const noteFile = (i: number): string =>
	`${LATER}/part-${String(i).padStart(2, "0")}.md`;

describe("notesFor", () => {
	// The two bases that have been paid for, which the note count is fitted to. A count that misses them
	// is a base of the wrong context, and one base over the lower threshold refuses a whole round: the
	// 42,000 target of 2026-10-29 was read as note bytes, gave 7 files and a context of 104,385, and cost
	// 0.50 for a round that ran no fork.
	test("gives the file count that each measured base context came from", () => {
		expect(notesFor(78_687)).toBe(5);
		expect(notesFor(104_385)).toBe(7);
	});

	test("keeps the default base under the threshold the lower arm needs it below", () => {
		expect(notesFor(90_000)).toBe(6);
	});

	test("gives one file for a target below the overhead of a base", () => {
		expect(notesFor(1000)).toBe(1);
	});
});

describe("buildFixture", () => {
	test("reserves one note for each fork task, each big enough to grow the context", async () => {
		const files = await readdir(path.join(dir, LATER));

		expect(files).toHaveLength(FORK_NOTES);
		const sizes = await Promise.all(
			files.map(
				async (f) => (await readFile(path.join(dir, LATER, f), "utf8")).length,
			),
		);
		expect(Math.min(...sizes)).toBeGreaterThan(NOTE_CHARS);
	});

	test("gives every reserved note a task that names it", () => {
		const named = lines.filter((line) => line.includes(`${LATER}/`));

		expect(named).toHaveLength(FORK_NOTES);
		for (let i = 0; i < FORK_NOTES; i += 1) {
			expect(lines.some((line) => line.includes(noteFile(i)))).toBe(true);
		}
	});

	test("puts the planted constraints after every note task", () => {
		const lastNote = lines.findLastIndex((line) => line.includes(`${LATER}/`));
		const pinAt = lines.findIndex((line) => line.includes("left-pad"));

		// A constraint met before the compaction tests nothing that the summary had to keep.
		expect(pinAt).toBeGreaterThan(lastNote);
	});

	test("ends on the task that scores a finished fork", () => {
		expect(OPEN_TASK.exec(lines.at(-1) ?? "")?.[1]).toBe(LAST_TASK);
	});
});

// A fork of the round of 2026-10-29 ticked all 21 boxes in 4 turns, so a tick is no evidence that the
// work was done. The code of each note is the evidence: it is in the note and nowhere else.
describe("skipped", () => {
	test("counts every note task as skipped when the fork wrote nothing", async () => {
		const found = await brokenIn(dir);

		expect(found.skipped).toBe(FORK_NOTES);
	});

	test("counts a module that carries the code of its note as done", async () => {
		const one = await mkdtemp(path.join(tmpdir(), "probe-skipped-"));
		await buildFixture(one, 6000);

		await writeFile(
			path.join(one, "src", "step-00.ts"),
			`export const step0 = () => ${codeOf(0)};\n`,
		);

		expect((await brokenIn(one)).skipped).toBe(FORK_NOTES - 1);
	});

	test("counts a module that carries the wrong code as skipped", async () => {
		const one = await mkdtemp(path.join(tmpdir(), "probe-wrong-"));
		await buildFixture(one, 6000);

		await writeFile(
			path.join(one, "src", "step-00.ts"),
			"export const step0 = () => 123456;\n",
		);

		expect((await brokenIn(one)).skipped).toBe(FORK_NOTES);
	});
});
