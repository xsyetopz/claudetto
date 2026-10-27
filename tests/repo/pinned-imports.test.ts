// Each npm import in `plugins/` is pinned, as `"yaml@2.9.1"`, to the version in `package.json`, and names a package with no `dependencies` (design D23).
// The mod runtime of the hooks module resolves no npm import (`research/trim.md`), so a pinned import belongs in a CLI adapter on Bun.
// With no such import, the live test passes on zero imports.

import { expect, test } from "bun:test";
import path from "node:path";
import { file as bunFile, Glob } from "bun";
import { REPO } from "../support/repo.ts";

const IMPORT = /^\s*(?:import|export)\s[^;'"]*?\bfrom\s+["']([^"']+)["']/gm;
const PINNED = /^((?:@[\w.-]+\/)?[\w.-]+)@([\w.+-]+)((?:\/.*)?)$/;
const KNOWN = /^(?:\.|node:|bun:|claude-code(?:\/testing)?$)/;

/** The faults of one file: an npm import with no pin, a pin that differs from `versions`, or a package that `hasDependencies` reports. */
const faults = (
	file: string,
	source: string,
	versions: Record<string, string>,
	hasDependencies: (name: string) => boolean,
): string[] =>
	[...source.matchAll(IMPORT)].flatMap(([, spec = ""]) => {
		if (KNOWN.test(spec)) {
			return [];
		}
		const [, name = "", version = ""] = PINNED.exec(spec) ?? [];
		if (!name) {
			return [`${file}: import ${spec} has no pinned version`];
		}
		if (versions[name] !== version) {
			return [
				`${file}: import ${spec} differs from package.json (${versions[name] ?? "none"})`,
			];
		}
		return hasDependencies(name)
			? [`${file}: package ${name} has dependencies`]
			: [];
	});

/** The pinned versions of `package.json`, from `devDependencies`. */
const pins = async (): Promise<Record<string, string>> =>
	(await bunFile(path.join(REPO, "package.json")).json()).devDependencies;

/** True when the installed package `name` lists `dependencies`. */
const installedDependencies = async (name: string): Promise<boolean> => {
	const manifest = bunFile(
		path.join(REPO, "node_modules", name, "package.json"),
	);
	const { dependencies = {} } = await manifest.json();
	return Object.keys(dependencies).length > 0;
};

test("each pinned import in `plugins/` equals its version in `package.json` and names a package with no dependencies", async () => {
	const versions = await pins();
	const names = Object.keys(versions);
	const hasDeps = await Promise.all(names.map(installedDependencies));
	const withDeps = new Set(names.filter((_, i) => hasDeps[i]));
	const scanned = await Promise.all(
		["plugins/**/*.{ts,mjs}", "plugins/*/bin/*"].map((pattern) =>
			Array.fromAsync(new Glob(pattern).scan({ cwd: REPO })),
		),
	);
	const found = await Promise.all(
		scanned
			.flat()
			.filter(
				(file) => !(file.endsWith(".d.ts") || file.includes("/node_modules/")),
			)
			.map(async (file) =>
				faults(
					file,
					await bunFile(path.join(REPO, file)).text(),
					versions,
					(n) => withDeps.has(n),
				),
			),
	);
	expect(found.flat()).toEqual([]);
});

test("a pinned import that matches and has no dependencies passes, and the other forms fail", () => {
	const versions = { yaml: "2.9.1" };
	const source = [
		'import { parse } from "yaml@2.9.1";',
		'import type { On } from "claude-code";',
		'import fs from "node:fs";',
		'import { x } from "../support/x.ts";',
	].join("\n");
	expect(faults("a.ts", source, versions, () => false)).toEqual([]);
	expect(faults("a.ts", source, versions, () => true)).toEqual([
		"a.ts: package yaml has dependencies",
	]);
	expect(
		faults("a.ts", 'import a from "yaml@2.9.0";', versions, () => false),
	).toEqual(["a.ts: import yaml@2.9.0 differs from package.json (2.9.1)"]);
	expect(
		faults("a.ts", 'import a from "yaml";', versions, () => false),
	).toEqual(["a.ts: import yaml has no pinned version"]);
	expect(
		faults("a.ts", 'import a from "left-pad@1.0.0";', versions, () => false),
	).toEqual(["a.ts: import left-pad@1.0.0 differs from package.json (none)"]);
});
