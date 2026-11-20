export const ROOT = /^(?:~|\$HOME|\$\{HOME\})\//u;

/**
 * A path as the folders it names from the root, or undefined for a relative
 * path read from anywhere but home. Without a known home, `~` stands in for it
 * on both sides, so `~/` walls and globs still compare.
 */
const fromRoot = (
	path: string,
	home: string | undefined,
	atHome: boolean
): string[] | undefined => {
	const base = home ?? "~";
	if (ROOT.test(path)) {
		return `${base}/${path.replace(ROOT, "")}`.split("/");
	}
	if (path.startsWith("/")) {
		return path.split("/");
	}
	return atHome ? `${base}/${path}`.split("/") : undefined;
};

/** One path segment of a shell glob, brace lists included, as a regular expression. */
const segmentPattern = (glob: string): RegExp => {
	let source = "";
	let braces = 0;
	for (let i = 0; i < glob.length; i++) {
		const c = glob.charAt(i);
		const end = c === "[" ? glob.indexOf("]", i + 2) : -1;
		if (c === "*") {
			while (glob.charAt(i + 1) === "*") {
				i++;
			}
			source += ".*";
		} else if (c === "?") {
			source += ".";
		} else if (c === "{" && /^\{[^{}]*,[^{}]*\}/u.test(glob.slice(i))) {
			braces++;
			source += "(?:";
		} else if (c === "," && braces > 0) {
			source += "|";
		} else if (c === "}" && braces > 0) {
			braces--;
			source += ")";
		} else if (end > 0) {
			source += `[${glob
				.slice(i + 1, end)
				.replace(/^!/u, "^")
				.replaceAll("\\", String.raw`\\`)}]`;
			i = end;
		} else {
			// An unclosed `[` is a literal, as the shell reads it.
			source += c.replaceAll(/[.+^${}()|\\[\]]/gu, String.raw`\$&`);
		}
	}
	return new RegExp(`^${source}$`, "u");
};

/** The words of a command that carry a glob character or a brace list, quotes removed. */
export const globWords = (command: string): string[] =>
	command
		.split(/[\s;&|()<>]+/u)
		.map((word) => word.replaceAll(/["']/gu, ""))
		.filter((word) => /[*?[]|\{[^{}]*,[^{}]*\}/u.test(word));

/**
 * Whether a glob word expands to a wall, though it may spell none of the
 * wall's name (`~/.c?audetto-h*`, `/Users/*\/.claudetto-holdout`). Both
 * compare as folders from the root, segment by segment. The segment that
 * lands on the wall's last folder must not be a bare `*`: a glob over only the
 * folder above the wall is left alone, because refusing `ls ~/*` would refuse
 * too much. A relative glob counts only after the command moves to home, so
 * `ls -a .*` in a project runs.
 *
 * @param words The glob words of the command.
 * @param wall A protected path as `protectedPaths` holds it.
 * @param home The home folder, or undefined when the engine reports none.
 * @param atHome Whether the command moves to home before the glob.
 * @returns True when a word matches the wall.
 */
export const globHitsWall = (
	words: string[],
	wall: string,
	home: string | undefined,
	atHome = false
): boolean => {
	const parts = fromRoot(wall, home, true) ?? [];
	return words.some((word) => {
		const segments = fromRoot(word, home, atHome);
		const last = segments?.[parts.length - 1];
		if (segments === undefined || last === undefined || /^\*+$/u.test(last)) {
			return false;
		}
		return parts.every((part, i) =>
			segmentPattern(segments[i] ?? "").test(part)
		);
	});
};
