// The boundary rules of the plugins, broken with fixtures: imports that leave a plugin, packages, and the graph of a hooks module.

import { expect, test } from "bun:test";
import {
	checkModuleGraph,
	checkNoPackages,
	checkPluginBoundary,
	checkTargets,
	faultMismatches,
	KERNEL,
	P,
	unreached,
} from "../support/import-rules.ts";

test("an import that leaves its plugin is a fault, for a plugin, `tools`, `dev`, and `tests`", () => {
	const files = {
		"plugins/claudetto-browser/hooks/register.ts": [
			'import { a } from "../../claudetto/lib/budget.ts";',
			'import { b } from "../../../tools/limits.ts";',
			'import { c } from "../../../tests/support/x.ts";',
			'import { e } from "../../../dev/x.ts";',
			'import { d } from "../features/browser/rules.ts";',
		].join("\n"),
	};
	const file = "plugins/claudetto-browser/hooks/register.ts";
	expect(
		faultMismatches(checkPluginBoundary(files), [
			[file, "../../claudetto/lib/budget.ts"],
			[file, "../../../tools/limits.ts"],
			[file, "../../../tests/support/x.ts"],
			[file, "../../../dev/x.ts"],
		]),
	).toStrictEqual([]);
});

test("an add-on that imports the kernel of another plugin fails", () => {
	const files = {
		"plugins/claudetto/kernel/budget.ts": "export const B = 1;\n",
		"plugins/claudetto-x/slices/s/slice.ts":
			'import { B } from "../../../claudetto/kernel/budget.ts";\n',
	};
	const file = "plugins/claudetto-x/slices/s/slice.ts";
	const target = "../../../claudetto/kernel/budget.ts";
	expect(
		faultMismatches(
			[...checkPluginBoundary(files), ...checkTargets(files)],
			[
				[file, target],
				[file, target],
			],
		),
	).toStrictEqual([]);
});

test("an add-on with no copy of a kernel file that it imports fails", () => {
	const files = {
		"plugins/claudetto-x/slices/s/slice.ts":
			'import { B } from "../../kernel/budget.ts";\n',
	};
	expect(
		faultMismatches(checkTargets(files), [
			["plugins/claudetto-x/slices/s/slice.ts", "../../kernel/budget.ts"],
		]),
	).toStrictEqual([]);
});

test("a kernel file that only another kernel file imports, with no outside importer, fails", () => {
	const files = {
		[`${KERNEL}a.ts`]: 'import { b } from "../kernel/b.ts";\n',
		[`${KERNEL}b.ts`]: "export const b = 1;\n",
		[`${KERNEL}c.ts`]: "export const c = 1;\n",
		[`${P}/modules/s/a.ts`]: 'import { c } from "../../kernel/c.ts";\n',
	};
	expect(unreached(files)).toStrictEqual([`${KERNEL}a.ts`, `${KERNEL}b.ts`]);
});

test("a package import is a fault, and a `node:` import is not", () => {
	const files = {
		[`${P}/skills/setup/scripts/a.ts`]:
			'import pkg from "left-pad";\nimport fs from "node:fs";\nimport { z } from "../../../lib/budget.ts";',
	};
	expect(
		faultMismatches(checkNoPackages(files), [
			[`${P}/skills/setup/scripts/a.ts`, "left-pad"],
		]),
	).toStrictEqual([]);
});

test("a type import of `claude-code` and a `bun:` module pass, and a value import of `claude-code` fails", () => {
	const files = {
		[`${P}/modules/x/rules.ts`]:
			'import type { Args } from "claude-code";\nimport { Database } from "bun:sqlite";',
		[`${P}/modules/y/rules.ts`]: 'import { Engine } from "claude-code";',
	};
	expect(
		faultMismatches(checkNoPackages(files), [
			[`${P}/modules/y/rules.ts`, "claude-code"],
		]),
	).toStrictEqual([]);
});

test("`node:`, `import()`, and a computed `on()` name in the module graph are faults", () => {
	const files = {
		[`${P}/hooks/register.ts`]:
			'import { a } from "../modules/gate/a.ts";\nexport function register(on) {\n  on("tool.check", () => {});\n  on(\n    "tool.call",\n    () => {},\n  );\n  on(EVENT, () => {});\n}',
		[`${P}/modules/gate/a.ts`]:
			'import { b } from "../../kernel/b.ts";\nconst m = await import("./x.ts");',
		[`${P}/kernel/b.ts`]: 'import fs from "node:fs";',
		[`${P}/modules/jev/adapters/cli.ts`]: 'import fs from "node:fs";',
	};
	const bad = checkModuleGraph(files);
	expect(bad).toHaveLength(3);
	const names = (file: string, value: string) =>
		bad.some((v) => v.includes(file) && v.includes(value));
	expect(names(`${P}/kernel/b.ts`, "node:fs")).toBe(true);
	expect(names(`${P}/modules/gate/a.ts`, "import()")).toBe(true);
	expect(names(`${P}/hooks/register.ts`, "on()")).toBe(true);
});

test("`bun`, a `bun:` module, and a read of `Bun` in the module graph are faults, and `claude-code` is not", () => {
	const files = {
		[`${P}/hooks/register.ts`]:
			'import type { Engine } from "claude-code";\nimport { $ } from "bun";\nimport { a } from "../kernel/a.ts";',
		[`${P}/kernel/a.ts`]:
			'import { Database } from "bun:sqlite";\nexport const a = Bun.file("x");',
	};
	expect(
		faultMismatches(checkModuleGraph(files), [
			[`${P}/hooks/register.ts`, "bun"],
			[`${P}/kernel/a.ts`, "bun:sqlite"],
			[`${P}/kernel/a.ts`, "Bun"],
		]),
	).toStrictEqual([]);
});

test("the module graph rule also covers the module of an add-on plugin", () => {
	const files = {
		"plugins/claudetto-browser/hooks/register.ts": 'import fs from "node:fs";',
	};
	expect(
		faultMismatches(checkModuleGraph(files), [
			["plugins/claudetto-browser/hooks/register.ts", "node:fs"],
		]),
	).toStrictEqual([]);
});
