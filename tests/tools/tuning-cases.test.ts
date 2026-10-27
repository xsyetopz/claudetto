// Prompt work (D17) does not see a case tagged `split:held-out`.

import { expect, test } from "bun:test";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { write as bunWrite } from "bun";
import { tuningCasesIn } from "../../dev/tuning-cases.ts";
import { REPO } from "../support/repo.ts";

test("the tuning cases leave out the held-out cases", async () => {
	const root = await mkdtemp(join(tmpdir(), "tune-"));
	const put = (name: string, tags: string[]) =>
		bunWrite(
			join(root, `plugins/claudetto/evals/${name}/case.yaml`),
			`name: ${name}\ntags: [${tags.join(", ")}]\n`,
		);
	await put("a", ["split:dev"]);
	await put("b", ["split:held-out"]);
	await put("c", []);
	expect(await tuningCasesIn(root)).toEqual(["a", "c"]);
});

test("the repository has a held-out case and it is not a tuning case", async () => {
	const names = await tuningCasesIn(REPO);
	expect(names.length).toBeGreaterThan(0);
	expect(names).not.toContain("library-docs");
});
