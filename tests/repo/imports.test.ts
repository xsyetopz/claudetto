// The import rules of the plugins (D4 of change `redesign-0-4-0`, rules `plugin-imports.md` and `hooks-module.md`).
// Each rule is a pure function from a map of path to source to a list of faults.
// The test runs each rule over the files of `plugins/`, and breaks each rule with a fixture.

import { expect, test } from "bun:test";
import {
	edges,
	type Files,
	inside,
	moduleGraph,
	parseImports,
	repoFiles,
	resolve,
	stripComments,
} from "../support/graph.ts";

const P = "plugins/claudetto";
const KERNEL = `${P}/kernel/`;
const MODULE_PATH = /^plugins\/claudetto\/modules\/([^/]+)\/(.+)$/;
const REGISTER_MODULE_FILE =
	/^plugins\/claudetto\/modules\/(?:[^/]+\/)+adapters\/[^/]+\.ts$/;
const DOMAIN_FORBIDDEN = /\/(adapters|kernel\/node)\//;
const ON_CALL = /(?<![\w.$])on\(/;
const TEST_FILE = /\.test\.[cm]?[jt]s$/;
const STATE_KEYS_LIST = /STATE_KEYS = \[([^\]]*)\]/;
const BUN_GLOBAL = /(?<![\w.$])Bun\b/;

/** The module of a path of `plugins/claudetto/modules/`, and the path in the module. */
const moduleOf = (file: string): { name: string; rest: string } | null => {
	const [, name, rest] = MODULE_PATH.exec(file) ?? [];
	return name === undefined || rest === undefined ? null : { name, rest };
};

/** A `bin/` file imports only the `adapters/cli.ts` of a module. */
const checkBin = (files: Files): string[] =>
	edges(files)
		.filter(({ file, target }) => file.startsWith(`${P}/bin/`) && target)
		.filter(({ target }) => moduleOf(target ?? "")?.rest !== "adapters/cli.ts")
		.map(
			({ file, spec }) =>
				`${file}: imports ${spec}, not a module adapters/cli.ts`,
		);

/** Each pair of modules that reach each other through imports. */
const checkCycles = (files: Files): string[] => {
	const graph = new Map<string, Set<string>>();
	for (const { file, target } of edges(files)) {
		const [from, to] = [moduleOf(file)?.name, target && moduleOf(target)?.name];
		if (from && to && from !== to) {
			graph.set(from, (graph.get(from) ?? new Set()).add(to));
		}
	}
	const reaches = (from: string, to: string): boolean => {
		const seen = new Set<string>();
		const queue = [from];
		for (let next = queue.pop(); next !== undefined; next = queue.pop()) {
			for (const n of graph.get(next) ?? []) {
				if (!seen.has(n)) {
					seen.add(n);
					queue.push(n);
				}
			}
		}
		return seen.has(to);
	};
	const names = [...graph.keys()].sort((a, b) => a.localeCompare(b));
	return names.flatMap((a) =>
		names
			.filter((b) => a < b && reaches(a, b) && reaches(b, a))
			.map((b) => `modules ${a} and ${b} import each other`),
	);
};

/** A kernel file imports no module. */
const checkKernel = (files: Files): string[] =>
	edges(files)
		.filter(({ file, target }) => file.startsWith(KERNEL) && target)
		.filter(({ target }) => moduleOf(target ?? ""))
		.map(({ file, spec }) => `${file}: kernel imports ${spec}, a module`);

/** `register.ts` imports only `claude-code`, the kernel, and an `adapters/` file of a module. */
const checkRegister = (files: Files): string[] =>
	edges(files)
		.filter(
			({ file, spec }) =>
				file === `${P}/hooks/register.ts` && spec !== "claude-code",
		)
		.filter(
			({ target }) =>
				!(
					target?.startsWith(KERNEL) || REGISTER_MODULE_FILE.test(target ?? "")
				),
		)
		.map(
			({ file, spec }) =>
				`${file}: imports ${spec}, not a module \`adapters/\` file or the kernel`,
		);

/** A file of a `domain/` folder imports no adapter and no `kernel/node/` file. */
const checkDomain = (files: Files): string[] =>
	edges(files)
		.filter(
			({ file, target }) =>
				file.includes("/domain/") && DOMAIN_FORBIDDEN.test(target ?? ""),
		)
		.map(({ file, spec }) => `${file}: domain imports ${spec}`);

/** No file other than a `register.ts` calls `on(`. */
const checkOnCalls = (files: Files): string[] =>
	Object.entries(files)
		.filter(([file]) => !file.endsWith("/hooks/register.ts"))
		.filter(([, src]) => ON_CALL.test(stripComments(src)))
		.map(([file]) => `${file}: on() call outside register.ts`);

/** No test file is in `plugins/` outside `plugins/claudetto/tests/`, which `repoFiles` leaves out. */
const checkTestFiles = (files: Files): string[] =>
	Object.keys(files)
		.filter((file) => TEST_FILE.test(file))
		.map((file) => `${file}: test file outside plugins/claudetto/tests/`);

/** Each literal `$.state` ref key is in the `STATE_KEYS` of a module `state.ts`. */
const checkStateKeys = (files: Files): string[] => {
	const listed = new Set(
		Object.entries(files)
			.filter(([file]) => moduleOf(file)?.rest === "state.ts")
			.flatMap(([, src]) => [
				...(STATE_KEYS_LIST.exec(src)?.[1] ?? "").matchAll(/"([^"]+)"/g),
			])
			.map((m) => m[1]),
	);
	return Object.entries(files).flatMap(([file, src]) =>
		[...src.matchAll(/\{\s*plugin:\s*"claudetto",\s*key:\s*"([^"]+)"/g)]
			.filter((m) => !listed.has(m[1]))
			.map((m) => `${file}: state key ${m[1]} is in no STATE_KEYS`),
	);
};

/** No import leaves its plugin, so none reaches another plugin, `tools/`, `dev/`, or `tests/`. */
const checkPluginBoundary = (files: Files): string[] =>
	edges(files)
		.filter(({ file, target }) => target && !inside(file, target))
		.map(({ file, spec }) => `${file}: import ${spec} leaves its plugin`);

/** Each relative import reaches a file of its own plugin, so an add-on holds its own copy of each kernel file that it uses. */
const checkTargets = (files: Files): string[] =>
	edges(files)
		.filter(
			({ file, target }) =>
				target && !(inside(file, target) && target in files),
		)
		.map(({ file, spec }) => `${file}: import ${spec} has no file`);

// A value import of "claude-code": an `import` that is not `import type`.
const CLAUDE_CODE_VALUE =
	/^[ \t]*import\s+(?!type\b)[^;]*?\bfrom\s*["']claude-code["']/m;

/** A plugin imports only relative files, `node:` modules, `bun:` modules, and the types of `claude-code`, never a package. */
const checkNoPackages = (files: Files): string[] =>
	edges(files)
		.filter(
			({ file, spec }) =>
				!spec.startsWith(".") &&
				!spec.startsWith("node:") &&
				!spec.startsWith("bun:") &&
				!(spec === "claude-code" && !CLAUDE_CODE_VALUE.test(files[file] ?? "")),
		)
		.map(({ file, spec }) => `${file}: bare import ${spec}`);

// The mod runtime loads only relative files and "claude-code" in a hooks module, and it has no `Bun` global (`research/probes.md`, 2.16).
const moduleFaults = (file: string, source: string): string[] => {
	const code = stripComments(source);
	const bad = parseImports(source).flatMap((imp) => {
		if (imp.dynamic) {
			return [`${file}: import() in the module graph`];
		}
		return resolve(file, imp.spec) || imp.spec === "claude-code"
			? []
			: [`${file}: ${imp.spec} in the module graph`];
	});
	if (BUN_GLOBAL.test(code)) {
		bad.push(`${file}: Bun global in the module graph`);
	}
	for (const m of code.matchAll(/(?<![\w.$])on\((?!\s*["'])/g)) {
		bad.push(`${file}: on() event name is not a string literal at ${m.index}`);
	}
	return bad;
};

/** The graph of a hooks module has no `node:` or `bun:` import, no `import()`, no `Bun`, and literal `on()` names. */
const checkModuleGraph = (files: Files): string[] =>
	[...moduleGraph(files)].flatMap((file) =>
		moduleFaults(file, files[file] ?? ""),
	);

const RULES = {
	checkBin,
	checkCycles,
	checkKernel,
	checkRegister,
	checkDomain,
	checkOnCalls,
	checkTestFiles,
	checkStateKeys,
	checkPluginBoundary,
	checkTargets,
	checkNoPackages,
	checkModuleGraph,
};

/** The kernel files that no file outside the kernel reaches through imports. */
const unreached = (files: Files): string[] => {
	const all = edges(files);
	const reached = new Set<string>();
	const queue = all
		.filter(({ file }) => !file.startsWith(KERNEL))
		.map(({ target }) => target);
	for (let next = queue.pop(); next !== undefined; next = queue.pop()) {
		if (next === null || !next.startsWith(KERNEL) || reached.has(next)) {
			continue;
		}
		reached.add(next);
		for (const e of all) {
			if (e.file === next) {
				queue.push(e.target);
			}
		}
	}
	return Object.keys(files)
		.filter((f) => f.startsWith(KERNEL) && !reached.has(f))
		.sort((a, b) => a.localeCompare(b));
};

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

/** The mismatches of `found` with `rows`: a wrong number of faults, and each value of a row that its fault lacks. `found` must hold one fault for each row, in order, and each fault must hold the values of its row (a file, an import, a key name). */
const faultMismatches = (
	found: readonly string[],
	rows: string[][],
): string[] => [
	...(found.length === rows.length
		? []
		: [`${found.length} faults, not ${rows.length}: ${found.join("; ")}`]),
	...rows.flatMap((values, i) =>
		values
			.filter((value) => !found[i]?.includes(value))
			.map((value) => `fault ${i} lacks ${value}`),
	),
];

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
			'import { s } from "../modules/session/search/domain/search.ts";',
		].join("\n"),
	};
	expect(
		faultMismatches(checkRegister(files), [
			[`${P}/hooks/register.ts`, "../skills/setup/scripts/settings.ts"],
			[`${P}/hooks/register.ts`, "./other.ts"],
			[`${P}/hooks/register.ts`, "../modules/session/search/domain/search.ts"],
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
