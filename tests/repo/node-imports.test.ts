// Code in `plugins/`, `tests/`, `tools/`, and `dev/` uses the Bun API where the map below gives one.
// A `node:` module stays only for what Bun 1.4.3 has no API for, such as `node:path` and the folder calls of `node:fs`.
// `existsSync` and `statSync` stay allowed, because a test cannot tell a file from a folder, and a folder keeps `node:fs`.
// The hook-lab tests (`plugins/*/tests/`) run in the mod runtime of `claude plugin test`, not in Bun, so they are out of scope.

import { expect, test } from "bun:test";
import path from "node:path";
import { file as bunFile, Glob } from "bun";
import { REPO } from "../support/repo.ts";

/** The `node:` modules that the map replaces as a whole, with the Bun API of each. */
const WHOLE: Record<string, string> = {
	"node:child_process": "Bun.spawn, Bun.spawnSync, Bun.$",
	"node:url":
		"import.meta.dir, import.meta.path, Bun.fileURLToPath, Bun.pathToFileURL",
	"node:http": "Bun.serve, fetch",
	"node:https": "fetch",
	"node:timers/promises": "Bun.sleep",
	"node:test": "bun:test",
	"node:assert": "bun:test expect",
	"node:assert/strict": "bun:test expect",
	"node:process": "Bun.env, Bun.argv, Bun.stdin",
	"node:crypto": "Bun.CryptoHasher, Bun.hash, crypto",
};

const FILE_CALLS = "Bun.file, Bun.write, BunFile.delete, Bun.Glob";

/** The members of a `node:` module that the map replaces, with the Bun API of each. */
const MEMBERS: Record<string, Record<string, string>> = {
	"node:fs": Object.fromEntries(
		[
			"readFileSync",
			"readFile",
			"writeFileSync",
			"writeFile",
			"unlinkSync",
			"unlink",
			"globSync",
			"glob",
		].map((name) => [name, FILE_CALLS]),
	),
	"node:fs/promises": Object.fromEntries(
		["readFile", "writeFile", "unlink", "glob"].map((name) => [
			name,
			FILE_CALLS,
		]),
	),
	"node:util": {
		inspect: "Bun.inspect",
		isDeepStrictEqual: "Bun.deepEquals",
	},
};

const NAMED_MEMBERS = /\{([\s\S]*)\}/;
const ALIAS_SEPARATOR = /\s+as\s+/;
const BRACED_CLAUSE = /\{[\s\S]*\}/;
const NAMESPACE_AS = /\*\s+as\s+/;
const SCRIPT_OUT_OF_SCOPE = /^plugins\/[^/]+\/tests\/|\/slices\/[^/]+\/lab\//;

const IMPORT =
	/^\s*import\s+(?:type\s+)?([^;'"]*?)\s+from\s+["'](node:[\w/]+)["'];?/gm;

/** The names that an import clause `clause` of `source` uses: the named members and the members read through the binding. */
const usedMembers = (clause: string, source: string): Set<string> => {
	const used = new Set<string>();
	const named = clause.match(NAMED_MEMBERS)?.[1] ?? "";
	for (const part of named.split(",")) {
		const name = part.trim().split(ALIAS_SEPARATOR)[0];
		if (name) {
			used.add(name);
		}
	}
	const binding = clause
		.replace(BRACED_CLAUSE, "")
		.replace(NAMESPACE_AS, "")
		.replace(/,/g, " ")
		.trim();
	if (binding) {
		for (const [, name = ""] of source.matchAll(
			new RegExp(`(?<![\\w.$])${binding}\\.(\\w+)`, "g"),
		)) {
			used.add(name);
		}
	}
	return used;
};

/** The faults of one file: each `node:` import or member that the map gives a Bun API for. */
const offMap = (file: string, source: string): string[] => {
	const faults: string[] = [];
	for (const [, clause = "", spec = ""] of source.matchAll(IMPORT)) {
		const whole = WHOLE[spec];
		if (whole) {
			faults.push(`${file}: ${spec} (use ${whole})`);
			continue;
		}
		const members = MEMBERS[spec];
		if (!members) {
			continue;
		}
		for (const name of [...usedMembers(clause, source)].sort((a, b) =>
			a.localeCompare(b),
		)) {
			const api = members[name];
			if (api) {
				faults.push(`${file}: ${spec} ${name} (use ${api})`);
			}
		}
	}
	return faults;
};

/** The script files of `plugins/`, `src/`, `tests/`, and `tools/`, with the `bin/` files that have no extension. The hook lab tests are out of scope. */
const scripts = async (): Promise<string[]> => {
	const scanned = await Promise.all(
		["{plugins,src,tests,tools,dev}/**/*.{ts,mjs}", "plugins/*/bin/*"].map(
			(pattern) => Array.fromAsync(new Glob(pattern).scan({ cwd: REPO })),
		),
	);
	const files = scanned
		.flat()
		.map((file) => file.split(path.sep).join("/"))
		.filter(
			(rel) =>
				!(
					SCRIPT_OUT_OF_SCOPE.test(rel) ||
					rel.endsWith(".d.ts") ||
					rel.includes("/node_modules/")
				),
		);
	return [...new Set(files)].sort((a, b) => a.localeCompare(b));
};

// A lint of the live repository.
test("lint: no file imports a `node:` module or member that the map gives a Bun API for", async () => {
	const faults = await Promise.all(
		(await scripts()).map(async (file) =>
			offMap(file, await bunFile(path.join(REPO, file)).text()),
		),
	);
	expect(faults.flat()).toEqual([]);
});

test("`node:child_process`, a file read through `node:fs`, and `inspect` fail, and a folder call and `node:path` pass", () => {
	const source = [
		'import { spawnSync } from "node:child_process";',
		'import fs from "node:fs";',
		'import { mkdirSync, writeFileSync as write } from "node:fs";',
		'import path from "node:path";',
		'import { inspect, parseArgs } from "node:util";',
		"fs.readdirSync(dir);",
		"fs.readFileSync(file);",
		"fs.mkdtempSync(dir);",
	].join("\n");
	const found = offMap("x.ts", source);
	expect(found).toHaveLength(4);
	const flagged = [
		"node:child_process",
		"readFileSync",
		"writeFileSync",
		"inspect",
	];
	flagged.forEach((name, i) => {
		expect(found[i]).toContain("x.ts");
		expect(found[i]).toContain(name);
	});
});

test("an import clause does not run across lines into a fixture string", () => {
	const source = [
		'import { REPO } from "../support/repo.ts";',
		"const f = [",
		"  'import fs from \"node:child_process\";',",
		"];",
	].join("\n");
	expect(offMap("x.ts", source)).toEqual([]);
});

test("a `node:` import inside a string of a fixture is not an import", () => {
	const source = "const f = 'import fs from \"node:child_process\";';";
	expect(offMap("x.ts", source)).toEqual([]);
});
