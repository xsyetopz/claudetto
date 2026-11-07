// Pure code, no model call: which lines the block of `.gitignore` and of `.ignore` holds.

import { detectFamilies, globOf, type Listing } from "./starter.ts";
import type { Family } from "./starter-families.ts";

/** The paths `Grep` leaves out. `.ignore` has no fixed line: only a family adds to it. */
export const GITIGNORE_FIXED: readonly string[] = [
	".DS_Store",
	"Thumbs.db",
	"*.swp",
	".claude/settings.local.json",
	".claude/worktrees/",
	".claude/claudetto/",
	"CLAUDE.local.md",
];

interface IgnoreLines {
	readonly gitignore: readonly string[];
	readonly ignore: readonly string[];
}

/** A pattern names a `dir/` anywhere, or a file name, with `*` for any run of characters. */
const regexOf = (pattern: string): RegExp =>
	pattern.endsWith("/")
		? new RegExp(`(^|/)${globOf(pattern.slice(0, -1))}/`)
		: new RegExp(`(^|/)${globOf(pattern)}$`);

const seen = (pattern: string, paths: readonly string[]): boolean => {
	const found = regexOf(pattern);
	return paths.some((path) => found.test(path));
};

const unique = (lines: readonly string[]): string[] => [...new Set(lines)];

/**
 * A heavy path git tracks is searched but not worth listing, so it goes to `.ignore`; one git does not track goes to
 * `.gitignore`. A lock or minified file is tracked in practice, so it goes to `.ignore` when git sees one, and nowhere else.
 */
export const ignoreLines = (listing: Listing): IgnoreLines => {
	const families: readonly Family[] = detectFamilies(listing.files);
	const heavy = unique(families.flatMap((family) => family.heavy));
	const bulky = unique(families.flatMap((family) => family.bulky ?? []));
	return {
		gitignore: unique([
			...GITIGNORE_FIXED,
			...heavy.filter((pattern) => !seen(pattern, listing.tracked)),
		]),
		ignore: [
			...heavy.filter((pattern) => seen(pattern, listing.tracked)),
			...bulky.filter((pattern) => seen(pattern, listing.files)),
		],
	};
};
