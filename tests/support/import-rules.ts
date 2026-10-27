// The import rules of the plugins (D4 of change `redesign-0-4-0`, rules `plugin-imports.md` and `hooks-module.md`), each a pure function from a map of path to source to a list of faults.

import {
	edges,
	type Files,
	inside,
	moduleGraph,
	parseImports,
	resolve,
	stripComments,
} from "./graph.ts";

export const P = "plugins/claudetto";
export const KERNEL = `${P}/kernel/`;
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
export const checkBin = (files: Files): string[] =>
	edges(files)
		.filter(({ file, target }) => file.startsWith(`${P}/bin/`) && target)
		.filter(({ target }) => moduleOf(target ?? "")?.rest !== "adapters/cli.ts")
		.map(
			({ file, spec }) =>
				`${file}: imports ${spec}, not a module adapters/cli.ts`,
		);

/** Each pair of modules that reach each other through imports. */
export const checkCycles = (files: Files): string[] => {
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
export const checkKernel = (files: Files): string[] =>
	edges(files)
		.filter(({ file, target }) => file.startsWith(KERNEL) && target)
		.filter(({ target }) => moduleOf(target ?? ""))
		.map(({ file, spec }) => `${file}: kernel imports ${spec}, a module`);

/** `register.ts` imports only `claude-code`, the kernel, and an `adapters/` file of a module. */
export const checkRegister = (files: Files): string[] =>
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
export const checkDomain = (files: Files): string[] =>
	edges(files)
		.filter(
			({ file, target }) =>
				file.includes("/domain/") && DOMAIN_FORBIDDEN.test(target ?? ""),
		)
		.map(({ file, spec }) => `${file}: domain imports ${spec}`);

/** No file other than a `register.ts` calls `on(`. */
export const checkOnCalls = (files: Files): string[] =>
	Object.entries(files)
		.filter(([file]) => !file.endsWith("/hooks/register.ts"))
		.filter(([, src]) => ON_CALL.test(stripComments(src)))
		.map(([file]) => `${file}: on() call outside register.ts`);

/** No test file is in `plugins/` outside `plugins/claudetto/tests/`, which `repoFiles` leaves out. */
export const checkTestFiles = (files: Files): string[] =>
	Object.keys(files)
		.filter((file) => TEST_FILE.test(file))
		.map((file) => `${file}: test file outside plugins/claudetto/tests/`);

/** Each literal `$.state` ref key is in the `STATE_KEYS` of a module `state.ts`. */
export const checkStateKeys = (files: Files): string[] => {
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
export const checkPluginBoundary = (files: Files): string[] =>
	edges(files)
		.filter(({ file, target }) => target && !inside(file, target))
		.map(({ file, spec }) => `${file}: import ${spec} leaves its plugin`);

/** Each relative import reaches a file of its own plugin, so an add-on holds its own copy of each kernel file that it uses. */
export const checkTargets = (files: Files): string[] =>
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
export const checkNoPackages = (files: Files): string[] =>
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
export const checkModuleGraph = (files: Files): string[] =>
	[...moduleGraph(files)].flatMap((file) =>
		moduleFaults(file, files[file] ?? ""),
	);

export const RULES = {
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
export const unreached = (files: Files): string[] => {
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

/** The mismatches of `found` with `rows`: a wrong number of faults, and each value of a row that its fault lacks. `found` must hold one fault for each row, in order, and each fault must hold the values of its row (a file, an import, a key name). */
export const faultMismatches = (
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
