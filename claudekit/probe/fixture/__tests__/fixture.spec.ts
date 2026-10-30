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

const NOTE_CHARS = 20_000;

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

		expect(pinAt).toBeGreaterThan(lastNote);
	});

	test("ends on the task that scores a finished fork", () => {
		expect(OPEN_TASK.exec(lines.at(-1) ?? "")?.[1]).toBe(LAST_TASK);
	});
});

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
