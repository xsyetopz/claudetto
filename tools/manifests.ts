// `package.json` is the reference: a contributor edits it first and `bun` reads it.
// Usage: bun tools/manifests.ts

import { join } from "node:path";
import { file as bunFile } from "bun";

/** The second plugin is listed because it ships from this repo under the same merge. */
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

export interface Declared {
	readonly path: string;
	readonly at: string;
	readonly version: string | undefined;
}

const isKeyed = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null;

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

export const declaredIn = async (root: string): Promise<Declared[]> =>
	await Promise.all(
		VERSION_SITES.map(async ({ path, at }) => ({
			path,
			at: at.join("."),
			version: valueAt(JSON.parse(await bunFile(join(root, path)).text()), at),
		})),
	);

export interface Fault {
	readonly path: string;
	readonly reason: string;
}

/** A site with no string at its key path is a fault, because a missing `version` ships none. */
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

export const manifestFaultsIn = async (root: string): Promise<Fault[]> =>
	faultsOf(await declaredIn(root));

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
