// Each file of `tools/` and `dev/` has a caller (spec `repo-tooling`, "No Unused Tool or Test").
// A caller is a recipe of `justfile`, a script of `package.json`, a CI workflow, the Biome config, or a file with a caller that imports the file or names its path.
// A file that is not code, such as a `Dockerfile`, has a caller when a file of its folder has one.

import { expect, test } from "bun:test";
import path from "node:path";
import { file as bunFile, spawn } from "bun";
import { parseImports, resolve } from "../support/graph.ts";
import { REPO } from "../support/repo.ts";

/** The source of each file, by its path under the repository. */
type Files = Record<string, string>;

const CODE = /\.(ts|mjs|js)$/;
const TOOL_OR_DEV = /^(tools|dev)\//;
const CALLER_ROOT =
	/^(justfile|package\.json|biome\.jsonc|\.github\/workflows\/[^/]+\.ya?ml)$/;

/** The files of `tools/` and `dev/` in `files` that no caller reaches from the texts of `roots`. */
const orphans = (files: Files, roots: string[]): string[] => {
	const called = new Set<string>();
	const queue: string[] = [];
	const add = (f: string | null) => {
		if (f && f in files && !called.has(f)) {
			called.add(f);
			queue.push(f);
		}
	};
	const reach = (text: string) => {
		for (const f of Object.keys(files)) {
			if (text.includes(f)) {
				add(f);
			}
		}
	};
	for (const text of roots) {
		reach(text);
	}
	for (let f = queue.shift(); f !== undefined; f = queue.shift()) {
		const text = files[f] ?? "";
		reach(text);
		if (CODE.test(f)) {
			for (const imp of parseImports(text)) {
				add(imp.dynamic ? null : resolve(f, imp.spec));
			}
		}
	}
	const dirs = new Set([...called].map((f) => path.posix.dirname(f)));
	return Object.keys(files)
		.filter((f) => !called.has(f))
		.filter((f) => CODE.test(f) || !dirs.has(path.posix.dirname(f)))
		.sort((a, b) => a.localeCompare(b));
};

const git = async (...args: string[]) => {
	const proc = spawn(["git", ...args], { cwd: REPO, stdout: "pipe" });
	return (await new Response(proc.stdout).text()).split("\n").filter(Boolean);
};

const read = (rel: string) => bunFile(path.join(REPO, rel)).text();

test("each file of `tools/` and `dev/` has a caller", async () => {
	const listed = await git(
		"ls-files",
		"--cached",
		"--others",
		"--exclude-standard",
	);
	const entries = await Promise.all(
		listed
			.filter((f) => TOOL_OR_DEV.test(f))
			.map(async (name) =>
				(await bunFile(path.join(REPO, name)).exists())
					? ([name, await read(name)] as const)
					: null,
			),
	);
	const files: Files = Object.fromEntries(entries.filter((e) => e !== null));
	const roots = listed.filter((f) => CALLER_ROOT.test(f));
	expect(roots).toContain("justfile");
	expect(orphans(files, await Promise.all(roots.map(read)))).toEqual([]);
});

test("a file that nothing names or imports is an orphan, and its import and its folder file are not", () => {
	const files = {
		"tools/run.ts": 'import { a } from "./a.ts";',
		"tools/a.ts": "",
		"dev/docker/image.ts": "",
		"dev/docker/Dockerfile": "",
		"dev/yolo/index.ts": "",
		"dev/yolo/notes.txt": "",
	};
	const roots = ["bun tools/run.ts", "bun dev/docker/image.ts"];
	expect(orphans(files, roots)).toEqual([
		"dev/yolo/index.ts",
		"dev/yolo/notes.txt",
	]);
});
