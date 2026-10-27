// The import rules of the plugins (D4 of change `redesign-0-4-0`, rules `plugin-imports.md` and `hooks-module.md`).
// Each rule is a pure function from a map of path to source to a list of faults.
// The test runs each rule over the files of `plugins/`. `layer-rules.test.ts` and `boundary-rules.test.ts` break each rule with a fixture.

import { expect, test } from "bun:test";
import { parseImports, repoFiles } from "../support/graph.ts";
import { KERNEL, P, RULES, unreached } from "../support/import-rules.ts";

test("the plugins hold the files that the rules read", async () => {
	const files = Object.keys(await repoFiles());
	for (const file of [
		`${P}/hooks/register.ts`,
		`${P}/kernel/hooks.ts`,
		`${P}/modules/session/prompt/adapters/mod.ts`,
		`${P}/modules/gate/state.ts`,
		`${P}/bin/minispec`,
	]) {
		expect(files.includes(file), file).toBeTruthy();
	}
});

for (const [name, check] of Object.entries(RULES)) {
	test(`the plugins pass \`${name}\``, async () => {
		expect(check(await repoFiles())).toStrictEqual([]);
	});
}

test("each kernel file has an importer outside the kernel, directly or through other kernel files", async () => {
	const files = await repoFiles(["plugins", "tools", "dev"]);
	expect(Object.keys(files).some((f) => f.startsWith(KERNEL))).toBeTruthy();
	expect(unreached(files)).toStrictEqual([]);
});

test("`parseImports` reads static, re-export, side-effect, and dynamic imports, and skips comments", () => {
	const src = [
		'/** @type {import("x").Y} */',
		'// import a from "commented";',
		'import a from "./a.ts";',
		'import {\n  b,\n} from "../b.ts";',
		'export * from "node:fs";',
		'import "./side.ts";',
		'const m = await import("./d.ts");',
		"const n = import(name);",
	].join("\n");
	expect(parseImports(src)).toStrictEqual([
		{ spec: "./a.ts", dynamic: false },
		{ spec: "../b.ts", dynamic: false },
		{ spec: "node:fs", dynamic: false },
		{ spec: "./side.ts", dynamic: false },
		{ spec: "./d.ts", dynamic: true },
		{ spec: null, dynamic: true },
	]);
});
