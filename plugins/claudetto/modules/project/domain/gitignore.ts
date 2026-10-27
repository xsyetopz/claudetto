// The `.gitignore` entries for the local files that claudetto writes into a project. A file that a team shares is not in the list.
const IGNORE_HEADER =
	"# Local state, cache, and scratch files of claudetto, not for the public repository.";
const STATE_ENTRY = "/.claude/claudetto/";
const IGNORE_ENTRIES = [
	STATE_ENTRY,
	"/.jscpd.json",
	"/.claude/settings.local.json",
];

const LEADING_SLASH = /^(\*\*)?\//;
const TRAILING_SLASH = /\/(\*\*?)?$/;

/** The root path that the entry `line` ignores, so `.claude/claudetto`, `/.claude/claudetto/`, and `/.claude/claudetto/**` give the same key. */
const keyOf = (line: string): string =>
	line.trim().replace(LEADING_SLASH, "").replace(TRAILING_SLASH, "");

/** True when `have` holds the key or a parent folder of it, so `.claude` covers `.claude/claudetto`. */
const covered = (have: ReadonlySet<string>, key: string): boolean =>
	have.has(key) ||
	key
		.split("/")
		.slice(0, -1)
		.some((_, i, parts) => have.has(parts.slice(0, i + 1).join("/")));

/** The break that keeps the added block apart from `text`. */
const gapBefore = (text: string): string => {
	if (text === "") {
		return "";
	}
	return text.endsWith("\n") ? "\n" : "\n\n";
};

/** `text` with the `lines` that it lacks appended under `header`, or `text` when it has all of them. A `!` line for an entry or a parent of it means the user tracks it on purpose, so the entry is not added. */
export const withLines = (
	text: string,
	header: string,
	lines: readonly string[],
): string => {
	const all = text.split("\n").map((line) => line.trim());
	const have = new Set(all.filter((l) => !l.startsWith("!")).map(keyOf));
	const kept = new Set(
		all.filter((l) => l.startsWith("!")).map((l) => keyOf(l.slice(1))),
	);
	const missing = lines.filter(
		(e) => !covered(have, keyOf(e)) && !covered(kept, keyOf(e)),
	);
	if (missing.length === 0) {
		return text;
	}
	const gap = gapBefore(text);
	return `${text}${gap}${header}\n${missing.join("\n")}\n`;
};

export const withIgnores = (text: string): string =>
	withLines(text, IGNORE_HEADER, IGNORE_ENTRIES);

/** `text` with `/.claude/claudetto/` when no entry ignores the folder, for the `session.start` step. */
export const withStateIgnore = (text: string): string =>
	withLines(text, IGNORE_HEADER, [STATE_ENTRY]);

export const withLocalNotes = (text: string): string =>
	withLines(text, "# Personal notes of the user for this project.", [
		"/CLAUDE.local.md",
	]);
