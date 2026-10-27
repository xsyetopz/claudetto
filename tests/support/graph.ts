// The import graph of the files of `plugins/`: each static, re-export, dynamic, and side-effect import, and the path that a relative import reaches.
// The rules in `tests/repo/imports.test.ts` read the graph.

import path from "node:path";
import { file as bunFile, spawn } from "bun";
import { REPO } from "./repo.ts";

/** The source of each file, by its path under the repository. */
export type Files = Record<string, string>;

/** An import of a source: a static `spec`, or a dynamic one with a `spec` only when it is a literal. */
export type Import =
	| { spec: string; dynamic: false }
	| { spec: string | null; dynamic: true };

/** A static import of a file, with the path that a relative `spec` points to. */
export interface Edge {
	file: string;
	spec: string;
	target: string | null;
}

const posix = path.posix;
const MODULE_ENTRY =
	/^plugins\/[^/]+\/hooks\/(register|module\/index)\.(?:mjs|ts)$/;
const SCRIPT_EXTENSION = /\.(mjs|cjs|js|ts)$/;
const DECLARATION_FILE = /\.d\.ts$/;
const BIN_SCRIPT = /^plugins\/[^/]+\/bin\/[^/.]+$/;

// Comments hold sample imports (a JSDoc type), so they are removed before the parse.
export const stripComments = (src: string): string =>
	src.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, "").replace(/^[ \t]*\/\/.*$/gm, "");

// Every import, re-export, and dynamic import of a source, as `{ spec, dynamic }`.
export const parseImports = (source: string): Import[] => {
	const src = stripComments(source);
	const found: Import[] = [];
	const from = /^[ \t]*(?:import|export)\b[^"'`;]*?\bfrom\s*["']([^"']+)["']/gm;
	const bare = /^[ \t]*import\s*["']([^"']+)["']/gm;
	for (const re of [from, bare]) {
		for (const m of src.matchAll(re)) {
			found.push({ spec: m[1] ?? "", dynamic: false });
		}
	}
	for (const m of src.matchAll(/(?<![\w.$])import\s*\(\s*(["'])?([^"')]*)/g)) {
		found.push({ spec: m[1] ? (m[2] ?? "") : null, dynamic: true });
	}
	return found;
};

// The plugin folder of a path: `plugins/<name>`.
const pluginOf = (file: string): string =>
	file.split("/").slice(0, 2).join("/");

// Where a relative import points, or `null` for a `node:` module or a bare package.
export const resolve = (file: string, spec: string): string | null =>
	spec.startsWith(".") ? posix.join(posix.dirname(file), spec) : null;

// The static relative and package imports of each file, with the target path of a relative one.
export const edges = (files: Files): Edge[] => {
	const out: Edge[] = [];
	for (const [file, source] of Object.entries(files)) {
		for (const imp of parseImports(source)) {
			if (!imp.dynamic) {
				out.push({ file, spec: imp.spec, target: resolve(file, imp.spec) });
			}
		}
	}
	return out;
};

// True when `target` is a path under the plugin of `file`.
export const inside = (file: string, target: string): boolean =>
	target === pluginOf(file) || target.startsWith(`${pluginOf(file)}/`);

// The part of a path under its plugin: `slices/reads/slice.ts` gives `slices/reads/slice.ts`, under `plugins/claudetto/`.
export const within = (file: string): string[] => file.split("/").slice(2);

const isModuleEntry = (file: string): boolean => MODULE_ENTRY.test(file);

// The files of the graphs of the hooks modules: each entry, and each file that a static relative import reaches.
export const moduleGraph = (files: Files): Set<string> => {
	const seen = new Set<string>();
	const queue = Object.keys(files).filter(isModuleEntry);
	while (queue.length > 0) {
		const file = queue.shift();
		const source = file === undefined ? undefined : files[file];
		if (file === undefined || source === undefined || seen.has(file)) {
			continue;
		}
		seen.add(file);
		for (const imp of parseImports(source)) {
			const target = imp.dynamic ? null : resolve(file, imp.spec);
			if (target) {
				queue.push(target);
			}
		}
	}
	return seen;
};

// A `bin/` file of a plugin is an entry point with no file extension.
// The hook labs of `plugins/claudetto/tests/` run in `claude plugin test` and import its types, so they are out of scope.
const isScript = (rel: string): boolean =>
	(SCRIPT_EXTENSION.test(rel) &&
		!DECLARATION_FILE.test(rel) &&
		!rel.startsWith("plugins/claudetto/tests/")) ||
	BIN_SCRIPT.test(rel);

// The tracked and new script files of `folders`, with no git-ignored file and no folder without files.
export const repoFiles = async (
	folders: string[] = ["plugins"],
): Promise<Files> => {
	const ls = spawn(
		[
			"git",
			"ls-files",
			"--cached",
			"--others",
			"--exclude-standard",
			...folders,
		],
		{ cwd: REPO, stdout: "pipe" },
	);
	const listed = (await new Response(ls.stdout).text()).split("\n");
	const scripts = listed.filter(isScript);
	const sources = await Promise.all(
		scripts.map(async (rel) => {
			const script = bunFile(path.join(REPO, rel));
			return (await script.exists())
				? ([rel, await script.text()] as const)
				: null;
		}),
	);
	return Object.fromEntries(sources.filter((entry) => entry !== null));
};
