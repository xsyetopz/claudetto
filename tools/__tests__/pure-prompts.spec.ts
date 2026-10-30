// A prompt module reads no clock, no counter, and no usage number, so two sessions with the same
// inputs get byte-identical prompt text. The byte-identity of a single build is driven through the
// shipped mod in `plugins/claudetto/tests/tool-describe.test.ts`.

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { impureReads, promptModules } from "../pure-prompts.ts";

describe("the shipped prompt path", () => {
	test("reaches the modules its entries import", async () => {
		const modules = await promptModules();

		expect(modules).toEqual(["tools/texts.ts", "tools/tools.ts"]);
	});

	test("reads no clock, no counter, and no usage number", async () => {
		expect(await impureReads()).toEqual([]);
	});
});

describe("the check names each impure reading", () => {
	let root = "";

	beforeAll(async () => {
		root = await mkdtemp("/tmp/claudetto-pure-");
		await mkdir(root, { recursive: true });
		await writeFile(
			join(root, "entry.ts"),
			'import { stamp } from "./helper.ts";\n\nexport const text = stamp();\n',
		);
		await writeFile(
			join(root, "helper.ts"),
			"export const stamp = (): string => String(Date.now());\n",
		);
		await writeFile(join(root, "clean.ts"), 'export const text = "fixed";\n');
	});

	afterAll(async () => {
		await rm(root, { recursive: true, force: true });
	});

	test("a clock an imported module reads, with its file and line", async () => {
		const faults = await impureReads(["entry.ts"], root);

		expect(faults).toEqual(["helper.ts:1 reads a clock through Date.now"]);
	});

	test("a module that reads nothing has no fault", async () => {
		expect(await impureReads(["clean.ts"], root)).toEqual([]);
	});

	test("an entry that is not there is skipped", async () => {
		expect(await promptModules(["no-such.ts"], root)).toEqual([]);
	});
});
