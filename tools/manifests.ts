// Four manifests declare the version of this project, and a release is the merge into `main`: Claude
// Code installs and updates a plugin from the default branch and the `version` of its manifest, so a
// manifest left behind at an older value ships that value to a user. Nothing compared the four.
// `tests/repo/manifests.test.ts` tests the `userConfig` options and the source paths, and
// `claude plugin validate` checks the shape of each file and not the value inside it, so the only rule
// was the prose of `CONTRIBUTING.md`, which named three of the four and missed the second plugin.
//
// `package.json` is the reference, because it is the one a contributor edits first and the one `bun`
// reads. A site that disagrees with it is the fault, and so is a site whose `version` is missing.
//
//   bun tools/manifests.ts

import { join } from "node:path";
import { file as bunFile } from "bun";

/**
 * Where this project declares its version, with the keys that reach the value in each file. The
 * marketplace holds it under `metadata`, and the other three hold it at the top level. The second
 * plugin is on the list because it ships from this repo under the same merge, so a user who installs
 * `claudetto-you-should-know` reads its manifest and not the one of the core plugin.
 */
export const VERSION_SITES: readonly {
	readonly path: string;
	readonly at: readonly string[];
}[] = [
	{ path: "package.json", at: ["version"] },
	{ path: ".claude-plugin/marketplace.json", at: ["metadata", "version"] },
	{ path: "plugins/claudetto/.claude-plugin/plugin.json", at: ["version"] },
	{
		path: "plugins/claudetto-you-should-know/.claude-plugin/plugin.json",
		at: ["version"],
	},
];

/** One declared version: the manifest, the dotted keys read, and the value, absent when no string sits there. */
export interface Declared {
	readonly path: string;
	readonly at: string;
	readonly version: string | undefined;
}

/** Whether `value` can be read by key, which is every object that is not `null`. */
const isKeyed = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null;

/** The string at the key path `at` in `value`, or undefined when a step is missing or the leaf is not a string. */
export const valueAt = (
	value: unknown,
	at: readonly string[],
): string | undefined => {
	let held: unknown = value;
	for (const key of at) {
		if (!isKeyed(held)) {
			return undefined;
		}
		held = held[key];
	}
	return typeof held === "string" ? held : undefined;
};

/** What each site of `root` declares, in the order of `VERSION_SITES`. */
export const declaredIn = async (root: string): Promise<Declared[]> =>
	await Promise.all(
		VERSION_SITES.map(async ({ path, at }) => ({
			path,
			at: at.join("."),
			version: valueAt(JSON.parse(await bunFile(join(root, path)).text()), at),
		})),
	);

/** One fault: the manifest that is wrong and why it is wrong against `package.json`. */
export interface Fault {
	readonly path: string;
	readonly reason: string;
}

/**
 * The faults of `declared`, read against its first entry, which is `package.json`. A site with no
 * string at its key path is a fault on its own, because a missing `version` ships no version at all.
 */
export const faultsOf = (declared: readonly Declared[]): Fault[] => {
	const [reference] = declared;
	if (reference === undefined) {
		return [];
	}
	const expected = reference.version;
	return declared.flatMap(({ path, at, version }) => {
		if (version === undefined) {
			return [{ path, reason: `has no string \`${at}\`` }];
		}
		if (expected === undefined || version === expected) {
			return [];
		}
		return [
			{
				path,
				reason: `declares \`${version}\`, and \`${reference.path}\` declares \`${expected}\``,
			},
		];
	});
};

/** Every fault of the manifests under `root`, in the order of `VERSION_SITES`. */
export const manifestFaultsIn = async (root: string): Promise<Fault[]> =>
	faultsOf(await declaredIn(root));

/** One line per fault, in the `file: reason` form the other checks of `just validate` print. */
export const manifestLines = (faults: readonly Fault[]): string[] =>
	faults.map(({ path, reason }) => `${path}: ${reason}`);

if (import.meta.main) {
	const lines = manifestLines(
		await manifestFaultsIn(join(import.meta.dir, "..")),
	);
	for (const line of lines) {
		console.error(line);
	}
	if (lines.length > 0) {
		process.exitCode = 1;
	}
}
