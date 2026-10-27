// The layer rules of the plugins, broken with fixtures: `bin/`, cycles, the kernel, `register.ts`, `domain/`, `on(`, test files, and state keys.

import { expect, test } from "bun:test";
import {
	checkBin,
	checkCycles,
	checkDomain,
	checkKernel,
	checkOnCalls,
	checkRegister,
	checkStateKeys,
	checkTestFiles,
	faultMismatches,
	P,
} from "../support/import-rules.ts";

test("a `bin/` file that imports a module file other than `adapters/cli.ts`, or the kernel, fails", () => {
	const files = {
		[`${P}/bin/x`]:
			'import { a } from "../modules/jev/adapters/cli.ts";\nimport { b } from "../modules/jev/domain/jev.ts";\nimport { c } from "../kernel/a.ts";',
	};
	expect(
		faultMismatches(checkBin(files), [
			[`${P}/bin/x`, "../modules/jev/domain/jev.ts"],
			[`${P}/bin/x`, "../kernel/a.ts"],
		]),
	).toStrictEqual([]);
});

test("Cycle: two modules that import each other fail, through a third module too, and a one-way import passes", () => {
	const files = {
		[`${P}/modules/gate/a.ts`]: 'import { w } from "../work/a.ts";',
		[`${P}/modules/work/a.ts`]: 'import { g } from "../gate/a.ts";',
		[`${P}/modules/jev/a.ts`]:
			'import { h } from "../shell/a.ts";\nimport { s } from "../spec/a.ts";',
		[`${P}/modules/spec/a.ts`]: 'import { t } from "../setup/a.ts";',
		[`${P}/modules/setup/a.ts`]: 'import { j } from "../jev/a.ts";',
	};
	expect(
		faultMismatches(checkCycles(files), [
			["gate", "work"],
			["jev", "setup"],
			["jev", "spec"],
			["setup", "spec"],
		]),
	).toStrictEqual([]);
});

test("Kernel Imports a Module: a kernel file that imports a module fails", () => {
	const files = {
		[`${P}/kernel/a.ts`]:
			'import { s } from "../modules/session/limits.ts";\nimport { t } from "./text.ts";',
	};
	expect(
		faultMismatches(checkKernel(files), [
			[`${P}/kernel/a.ts`, "../modules/session/limits.ts"],
		]),
	).toStrictEqual([]);
});

test("`register.ts` that imports a file other than a module `adapters/` file, the kernel, or `claude-code` fails", () => {
	const files = {
		[`${P}/hooks/register.ts`]: [
			'import type { On } from "claude-code";',
			'import { o } from "../kernel/options.ts";',
			'import { g } from "../modules/gate/adapters/mod.ts";',
			'import { d } from "../skills/setup/scripts/settings.ts";',
			'import { x } from "./other.ts";',
			'import { s } from "../modules/gate/domain/gate.ts";',
		].join("\n"),
	};
	expect(
		faultMismatches(checkRegister(files), [
			[`${P}/hooks/register.ts`, "../skills/setup/scripts/settings.ts"],
			[`${P}/hooks/register.ts`, "./other.ts"],
			[`${P}/hooks/register.ts`, "../modules/gate/domain/gate.ts"],
		]),
	).toStrictEqual([]);
});

test("a `domain/` file that imports an adapter or `kernel/node/` fails, and a `domain/` or `kernel/` import passes", () => {
	const files = {
		[`${P}/modules/gate/domain/a.ts`]: [
			'import { m } from "../adapters/mod.ts";',
			'import { f } from "../../../kernel/node/fs.ts";',
			'import { t } from "../../../kernel/text.ts";',
			'import { b } from "./b.ts";',
		].join("\n"),
	};
	expect(
		faultMismatches(checkDomain(files), [
			[`${P}/modules/gate/domain/a.ts`, "../adapters/mod.ts"],
			[`${P}/modules/gate/domain/a.ts`, "../../../kernel/node/fs.ts"],
		]),
	).toStrictEqual([]);
});

test("Rule Outside the Register File: a module that calls `on(` fails, and `register.ts`, a comment, and `.on(` pass", () => {
	const files = {
		[`${P}/hooks/register.ts`]: 'on("tool.check", h);',
		[`${P}/modules/gate/adapters/mod.ts`]:
			'// on("x", y)\nemitter.on("x", y);\non("tool.check", h);',
		[`${P}/modules/work/a.ts`]: "// on(\nconst won = (a) => a;\nwon(1);",
	};
	expect(
		faultMismatches(checkOnCalls(files), [
			[`${P}/modules/gate/adapters/mod.ts`],
		]),
	).toStrictEqual([]);
});

test("Test in a Module: a test file in `plugins/` outside `plugins/claudetto/tests/` fails", () => {
	const files = {
		[`${P}/modules/gate/x.test.ts`]: "",
		[`${P}/modules/gate/x.ts`]: "",
	};
	expect(
		faultMismatches(checkTestFiles(files), [[`${P}/modules/gate/x.test.ts`]]),
	).toStrictEqual([]);
});

test("a `$.state` ref key that no `STATE_KEYS` lists fails", () => {
	const files = {
		[`${P}/modules/work/state.ts`]:
			'export const STATE_KEYS = [\n  "note",\n  "notes",\n] as const;',
		[`${P}/modules/work/a.ts`]:
			'const a = { plugin: "claudetto", key: "notes" } as const;\nconst b = { plugin: "claudetto", key: "nope" } as const;',
	};
	expect(
		faultMismatches(checkStateKeys(files), [
			[`${P}/modules/work/a.ts`, "nope"],
		]),
	).toStrictEqual([]);
});
