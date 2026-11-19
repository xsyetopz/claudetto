import type { On, PluginOptions } from "claude-code";
import { fault } from "../fault";
import { WALLS } from "./rules";

/**
 * The spellings of a wall a shell command can name: a `~/` path also appears
 * as `$HOME/`, `${HOME}/` and the expanded home folder.
 *
 * @param wall A protected path as `protectedPaths` holds it.
 * @param home The home folder, or undefined when the engine reports none.
 * @returns Each text whose presence in a command names the wall.
 */
export const wallNames = (wall: string, home: string | undefined): string[] => {
	const tail = /^(?:~|\$HOME|\$\{HOME\})\//u.exec(wall) === null ? undefined : wall.replace(/^[^/]+\//u, "");
	if (tail === undefined) return [wall];
	return ["~/", "$HOME/", "${HOME}/", ...(home === undefined ? [] : [`${home}/`])].map((root) => `${root}${tail}`);
};

const ROOT = /^(?:~|\$HOME|\$\{HOME\})\//u;

/**
 * A path as the folders it names from the root, or undefined for a relative
 * path read from anywhere but home. Without a known home, `~` stands in for it
 * on both sides, so `~/` walls and globs still compare.
 */
const fromRoot = (path: string, home: string | undefined, atHome: boolean): string[] | undefined => {
	const base = home ?? "~";
	if (ROOT.test(path)) return `${base}/${path.replace(ROOT, "")}`.split("/");
	if (path.startsWith("/")) return path.split("/");
	return atHome ? `${base}/${path}`.split("/") : undefined;
};

/** Whether the command moves to home first (`cd`, `cd ~`, `cd $HOME`), so a relative glob is read from there. */
const movesHome = (command: string, home: string | undefined): boolean => {
	const target = ["~", "$HOME", "${HOME}", ...(home === undefined ? [] : [home])].map((t) => t.replace(/[$^{}.*+?()[\]|\\/]/gu, "\\$&")).join("|");
	return new RegExp(`(?:^|[;&|({\\n]\\s*)(?:cd|pushd)(?:\\s+["']?(?:${target})/?["']?)?\\s*(?:$|[;&|)])`, "u").test(command);
};

/** One path segment of a shell glob, brace lists included, as a regular expression. */
const segmentPattern = (glob: string): RegExp => {
	let source = "";
	let braces = 0;
	for (let i = 0; i < glob.length; i++) {
		const c = glob.charAt(i);
		const end = c === "[" ? glob.indexOf("]", i + 2) : -1;
		if (c === "*") {
			while (glob.charAt(i + 1) === "*") i++;
			source += ".*";
		} else if (c === "?") source += ".";
		else if (c === "{" && /^\{[^{}]*,[^{}]*\}/u.test(glob.slice(i))) {
			braces++;
			source += "(?:";
		} else if (c === "," && braces > 0) source += "|";
		else if (c === "}" && braces > 0) {
			braces--;
			source += ")";
		} else if (end > 0) {
			source += `[${glob.slice(i + 1, end).replace(/^!/u, "^").replace(/\\/gu, "\\\\")}]`;
			i = end;
		} else source += c.replace(/[.+^${}()|\\[\]]/gu, "\\$&"); // An unclosed `[` is a literal, as the shell reads it.
	}
	return new RegExp(`^${source}$`, "u");
};

/** The words of a command that carry a glob character or a brace list, quotes removed. */
export const globWords = (command: string): string[] =>
	command
		.split(/[\s;&|()<>]+/u)
		.map((word) => word.replace(/["']/gu, ""))
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
export const globHitsWall = (words: string[], wall: string, home: string | undefined, atHome = false): boolean => {
	const parts = fromRoot(wall, home, true) ?? [];
	return words.some((word) => {
		const segments = fromRoot(word, home, atHome);
		const last = segments?.[parts.length - 1];
		if (segments === undefined || last === undefined || /^\*+$/u.test(last)) return false;
		return parts.every((part, i) => segmentPattern(segments[i] ?? "").test(part));
	});
};

/** `$(echo X)` and backtick echoes whose body is plain text, so the value is known before the shell runs. */
const LITERAL_ECHO = /\$\(\s*(?:echo|printf)\s+(?:-[neE]+\s+)?([^$`;&|()<>\\]*)\)|`\s*(?:echo|printf)\s+(?:-[neE]+\s+)?([^$`;&|()<>\\]*)`/gu;
const ASSIGNMENT = /(?:^|[;&|(\n\s])(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=("[^"$`\\]*"|'[^']*'|[^\s;&|()"'$`\\]*)/gu;
const VARIABLE = /\$(?:\{([A-Za-z_][A-Za-z0-9_]*)\}|([A-Za-z_][A-Za-z0-9_]*))/gu;

/**
 * The command with what can be known before it runs filled in: `$(echo X)`
 * and backtick echoes become X, and a variable assigned a literal in the same
 * command is replaced by its value, so `d=.claudetto; ls ~/${d}-holdout` reads
 * as `ls ~/.claudetto-holdout`. `HOME` is left alone, since the guard already
 * knows its spellings. Anything else dynamic stays as written.
 */
export const expandStatic = (command: string): string => {
	let text = command;
	for (let round = 0; round < 3; round++) {
		const vars = new Map<string, string>();
		text = text.replace(LITERAL_ECHO, (_m, a: string | undefined, b: string | undefined) => (a ?? b ?? "").replace(/["']/gu, "").trim());
		for (const m of text.matchAll(ASSIGNMENT)) {
			const name = m[1] ?? "";
			if (name !== "HOME") vars.set(name, (m[2] ?? "").replace(/["']/gu, ""));
		}
		const next = text.replace(VARIABLE, (whole, a: string | undefined, b: string | undefined) => vars.get(a ?? b ?? "") ?? whole);
		if (next === text) break;
		text = next;
	}
	return text;
};

/**
 * The command with `/./`, `//` and `name/../` folded out of its paths, so
 * `~/./x`, `~//x` and `~/src/../x` read as `~/x`, which is where the shell
 * lands. A `..` segment is never folded into another `..`.
 */
export const foldPaths = (text: string): string => {
	let out = text;
	for (let prev = ""; prev !== out; ) {
		prev = out;
		out = out
			.replace(/\/(?:\.\/)+/gu, "/")
			.replace(/\/{2,}/gu, "/")
			.replace(/\/(?!\.\.\/)[^/\s"';&|()<>]+\/\.\.(?=\/)/gu, "");
	}
	return out;
};

const escapeRegExp =(text: string): string => text.replace(/[$^{}.*+?()[\]|\\/]/gu, "\\$&");

/**
 * Whether the wall's folder is built at run time, so its name cannot be read
 * before the command runs: a home-rooted path whose first folder is dynamic
 * (`~/$x`, `$HOME/$(cmd)`), or a dynamic part followed by the wall's last
 * folder (`$(cmd)/.claudetto-holdout`). Folders deeper than the wall's depth
 * (`~/.config/$x`) are left alone.
 */
export const dynamicWall = (text: string, wall: string, home: string | undefined): boolean => {
	const roots = ["~", "$HOME", "${HOME}", ...(home === undefined ? [] : [home])].map(escapeRegExp).join("|");
	const dynamic = "(?:\\$\\(|`|\\$\\{?[A-Za-z_@*#?!0-9])";
	const atRoot = new RegExp(`(?:^|[\\s"'=:(])(?:${roots})/[^\\s/"']*${dynamic}`, "u");
	const last = escapeRegExp(wall.replace(/^.*\//u, ""));
	const beforeName = new RegExp(`(?:\\)|\`|\\$\\{?[A-Za-z_][A-Za-z0-9_]*\\}?)/${last}(?:[\\s/"';&|)]|$)`, "u");
	return (ROOT.test(wall) && atRoot.test(text)) || beforeName.test(text);
};

/** The reason a call is refused, written as the next step because the model reads it. */
export const wallReason = (wall: string): string =>
	`${wall} is walled off from every session. Leave it alone; to check a rule that covers it, run the same command on a stand-in folder under the same rule.`;

/**
 * Refuses a Bash call that names a walled path (RISK-118). The sandbox
 * `denyRead` covers sandboxed calls only; a sandbox-off call otherwise rests on
 * the permission prompt or the auto mode classifier.
 */
export function registerWall(on: On, options: PluginOptions = {}): void {
	const held = options["protectedPaths"];
	const walls = Array.isArray(held) ? (held as string[]) : WALLS;
	if (walls.length === 0) return;
	on("tool.call", { tool: "Bash" }, async ($, e, next) => {
		if (e.tool !== "Bash") return next(e);
		// A spelled wall ends in its last part; only a glob, a variable or a substitution can name a wall without it.
		const command = e.command;
		const text = foldPaths(expandStatic(command));
		const words = globWords(text);
		const named = walls.some((wall) => text.includes(wall.replace(/^.*\//u, "")) || command.includes(wall.replace(/^.*\//u, "")));
		if (words.length === 0 && !named && !/[$`]/u.test(text)) return next(e);
		// Without a home the `~/` and `$HOME/` spellings and globs still match; only the expanded one is lost.
		const home = await $.env.get("HOME").catch(() => undefined);
		const atHome = movesHome(text, home);
		// After a move to home, a plain relative word names a folder of home as much as a glob does.
		const reach = atHome ? text.split(/[\s;&|()<>]+/u).map((w) => w.replace(/["']/gu, "")).filter(Boolean) : words;
		const hit = walls.find(
			(wall) => [command, text].some((t) => wallNames(wall, home).some((name) => t.includes(name))) || globHitsWall(reach, wall, home, atHome) || dynamicWall(text, wall, home),
		);
		return hit === undefined ? next(e) : { deny: wallReason(hit) };
	}).catch(($, e, next) => (fault($, "wall guard", next.error), next(e)));
}
