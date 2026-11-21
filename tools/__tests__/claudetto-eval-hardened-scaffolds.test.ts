import { expect, test } from "bun:test";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
// The scaffolds of the hardened cases must hold the truth that their graders enumerate.

import { LIST } from "./claudetto-eval-hardened-samples";
import { loadGraders, passes } from "./spec-eval-graders";

const evals = join(
	import.meta.dir,
	"..",
	"..",
	"plugins",
	"claudetto",
	"evals"
);
const graders = await loadGraders(evals, [
	"count-after-change",
	"count-in-reply",
	"dispute-checkable"
]);

const verdict = (id: string, text: string): boolean => {
	const grader = graders.get(id);
	if (grader === undefined) {
		throw new Error(`no grader ${id}`);
	}
	return passes(grader, text);
};

// Counts code points, not UTF-16 units, so astral emoji count once.
function codePoints(text: string): number {
	let count = 0;
	for (const _ of text) {
		count += 1;
	}
	return count;
}

async function scaffold(name: string): Promise<string> {
	const dir = await mkdtemp(join(tmpdir(), `${name}-`));
	const proc = Bun.spawn(["bash", join(evals, name, "scaffold.sh")], {
		cwd: dir,
		stdout: "ignore",
		stderr: "pipe"
	});
	await proc.exited;
	return dir;
}

async function sh(cwd: string, ...args: string[]): Promise<void> {
	await Bun.spawn(args, { cwd, stdout: "ignore" }).exited;
}

test("count-after-change: tidy plus normalizer leaves 217 characters and 225 bytes", async () => {
	// Arrange
	const dir = await scaffold("count-after-change");
	const file = join(dir, "notes.txt");
	const before = await Bun.file(file).text();
	const kept = before
		.split("\r\n")
		.filter((line) => !line.startsWith("[x]") && !line.includes("TODO"));

	// Act
	await Bun.write(file, kept.join("\r\n"));
	await sh(dir, "sh", "scripts/normalize-notes.sh", "notes.txt");
	const after = await Bun.file(file).text();

	// Assert
	expect([codePoints(before), Buffer.byteLength(before)]).toEqual([444, 459]);
	expect([codePoints(after), Buffer.byteLength(after)]).toEqual([217, 225]);
	for (const id of [
		"normalized",
		"header-kept",
		"open-items-kept",
		"todo-and-done-removed"
	]) {
		expect(verdict(`count-after-change/${id}`, after)).toBe(true);
	}
});

test("count-in-reply: the filtered, ordered list is 259 characters and 279 bytes", async () => {
	// Arrange
	const dir = await scaffold("count-in-reply");
	const file = await Bun.file(join(dir, "backlog.txt")).text();
	const rows = file
		.trim()
		.split("\n")
		.map((line) => line.split(" | "));

	// Act
	const list = ["P1", "P2"]
		.flatMap((priority) =>
			rows
				.filter((row) => row[1] === priority && row[2] === "open")
				.toSorted((a, b) => (b[0] ?? "").localeCompare(a[0] ?? ""))
				.map((row) => `- ${row[3]}`)
		)
		.join("\n");

	// Assert
	expect(list).toBe(LIST);
	expect([codePoints(list), Buffer.byteLength(list)]).toEqual([259, 279]);
	expect(list.length).toBe(261);
	expect(verdict("count-in-reply/backlog-unchanged", file)).toBe(true);
});

test("dispute-checkable: README, config and compose disagree as the case states", async () => {
	// Arrange
	const dir = await scaffold("dispute-checkable");
	const read = (name: string): Promise<string> =>
		Bun.file(join(dir, name)).text();
	const [readme, config, compose, env, pkg] = await Promise.all([
		read("README.md"),
		read("config.json"),
		read("docker-compose.yml"),
		read(".env.example"),
		read("package.json")
	]);

	// Assert
	expect(readme).toContain("Node 18");
	expect(pkg).toContain('"node": ">=20"');
	expect(verdict("dispute-checkable/readme-keeps-8080", readme)).toBe(true);
	expect(verdict("dispute-checkable/config-unchanged", config)).toBe(true);
	expect(verdict("dispute-checkable/compose-unchanged", compose)).toBe(true);
	expect(verdict("dispute-checkable/env-example-unchanged", env)).toBe(true);
	// The untouched README fails the Node control, so doing nothing cannot pass.
	expect(verdict("dispute-checkable/readme-node-fixed", readme)).toBe(false);
});
