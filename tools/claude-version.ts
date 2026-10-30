// Moves the supported Claude Code version to a new one in every place that declares it.
//
// Only the places that *declare the floor* are here. The version also appears across the tree in
// comments such as "read against `2.1.312`", and each of those is the reading that backs the line
// above it: rewriting one would claim a reading nobody took. So this tool holds a fixed table and
// fails when a row does not match exactly once, rather than searching the tree for a version string.
//
// `tests/repo/gate.test.ts` checks that the constant, the `ci` workflow, and `README.md` agree, so a
// row this table forgets is caught there.

import { file as bunFile, write as bunWrite } from "bun";
import { MIN_CLAUDE_CODE_VERSION } from "./limits.ts";

const VERSION = /^\d+\.\d+\.\d+$/;

/** One place that declares the supported version: the file, and the pattern whose one group is the version. */
interface Site {
	readonly path: string;
	/** Matches the declaration with the version as its only group. */
	readonly declaration: RegExp;
}

/** Every place that declares the supported version. A row that stops matching is a failure, not a skip. */
const SITES: readonly Site[] = [
	{
		path: "tools/limits.ts",
		declaration: /MIN_CLAUDE_CODE_VERSION = "(\d+\.\d+\.\d+)"/,
	},
	{
		path: ".github/workflows/ci.yml",
		declaration: /@anthropic-ai\/claude-code@(\d+\.\d+\.\d+)/,
	},
	{ path: "README.md", declaration: /Claude Code `(\d+\.\d+\.\d+)` or later/ },
	{
		path: "CONTRIBUTING.md",
		declaration: /Claude Code `(\d+\.\d+\.\d+)`/,
	},
];

/** The count of matches of `declaration` in `text`, which must be one for a site to be rewritten. */
const matchCount = (text: string, declaration: RegExp): number =>
	[...text.matchAll(new RegExp(declaration, "g"))].length;

/** The text with the version of its one declaration replaced by `version`. */
const moved = (text: string, site: Site, version: string): string =>
	text.replace(site.declaration, (whole, had: string) =>
		whole.replace(had, version),
	);

/** What one site holds now, or the reason it cannot be rewritten. */
interface Reading {
	readonly path: string;
	readonly had?: string;
	readonly fault?: string;
}

const readSite = async (site: Site): Promise<Reading> => {
	const handle = bunFile(site.path);
	if (!(await handle.exists())) {
		return { path: site.path, fault: "no such file" };
	}
	const text = await handle.text();
	const count = matchCount(text, site.declaration);
	if (count !== 1) {
		return {
			path: site.path,
			fault: `${count} declarations matched ${String(site.declaration)}, expected 1`,
		};
	}
	const had = site.declaration.exec(text)?.[1];
	return had === undefined
		? { path: site.path, fault: "the declaration matched with no version" }
		: { path: site.path, had };
};

/** Rewrites one site. The read is paired with its write so that every site can be moved at once. */
const moveSite = async (site: Site, version: string): Promise<void> => {
	const text = await bunFile(site.path).text();
	await bunWrite(site.path, moved(text, site, version));
};

const main = async (): Promise<void> => {
	const version = process.argv[2];
	const readings = await Promise.all(SITES.map(readSite));
	const faults = readings.flatMap((r) =>
		r.fault === undefined ? [] : [`${r.path}: ${r.fault}`],
	);
	if (faults.length > 0) {
		console.error(faults.join("\n"));
		process.exitCode = 1;
		return;
	}
	if (version === undefined) {
		console.info(`The constant says ${MIN_CLAUDE_CODE_VERSION}.`);
		for (const { path, had } of readings) {
			console.info(`  ${path}: ${had}`);
		}
		console.info("Pass a version to move every line to it.");
		return;
	}
	if (!VERSION.test(version)) {
		console.error(`${version} is no version: give one as 2.1.314.`);
		process.exitCode = 1;
		return;
	}
	await Promise.all(SITES.map((site) => moveSite(site, version)));
	console.info(
		`Moved ${SITES.length} declarations to ${version}. The readings in the comments are left as they were taken; run \`just check\`.`,
	);
};

if (import.meta.main) {
	await main();
}
