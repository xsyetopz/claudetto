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

/** A wall or glob with its home root removed, so both compare on the part below home. */
const belowHome = (path: string, home: string | undefined): string => {
	if (ROOT.test(path)) return path.replace(ROOT, "");
	return home !== undefined && path.startsWith(`${home}/`) ? path.slice(home.length + 1) : path;
};

/** One path segment of a shell glob as a regular expression. */
const segmentPattern = (glob: string): RegExp => {
	let source = "";
	for (let i = 0; i < glob.length; i++) {
		const c = glob.charAt(i);
		const end = c === "[" ? glob.indexOf("]", i + 2) : -1;
		if (c === "*") {
			while (glob.charAt(i + 1) === "*") i++;
			source += ".*";
		} else if (c === "?") source += ".";
		else if (end > 0) {
			source += `[${glob.slice(i + 1, end).replace(/^!/u, "^").replace(/\\/gu, "\\\\")}]`;
			i = end;
		} else source += c.replace(/[.+^${}()|\\\]]/gu, "\\$&");
	}
	return new RegExp(`^${source}$`, "u");
};

/** The words of a command that carry a glob character, quotes removed. */
export const globWords = (command: string): string[] =>
	command
		.split(/[\s;&|()<>]+/u)
		.map((word) => word.replace(/["']/gu, ""))
		.filter((word) => /[*?[]/u.test(word));

/**
 * Whether a glob word expands to a wall, though it spells none of the wall's
 * name (`~/.c?audetto-h*`). Each leading segment of the word must match the
 * wall's segment, and the wall's last one must not be a bare `*`: a glob over
 * only the folder above the wall is left alone, because refusing `ls ~/*`
 * would refuse too much.
 *
 * @param words The glob words of the command.
 * @param wall A protected path as `protectedPaths` holds it.
 * @param home The home folder, or undefined when the engine reports none.
 * @returns True when a word matches the wall.
 */
export const globHitsWall = (words: string[], wall: string, home: string | undefined): boolean => {
	const parts = belowHome(wall, home).split("/");
	return words.some((word) => {
		const segments = belowHome(word, home).split("/");
		const last = segments[parts.length - 1];
		if (last === undefined || /^\*+$/u.test(last)) return false;
		return parts.every((part, i) => segmentPattern(segments[i] ?? "").test(part));
	});
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
		// A spelled wall ends in its last part; only a glob can name a wall without it.
		const command = e.command;
		const words = globWords(command);
		if (words.length === 0 && !walls.some((wall) => command.includes(wall.replace(/^.*\//u, "")))) return next(e);
		// Without a home the `~/` and `$HOME/` spellings and globs still match; only the expanded one is lost.
		const home = await $.env.get("HOME").catch(() => undefined);
		const hit = walls.find((wall) => wallNames(wall, home).some((name) => command.includes(name)) || globHitsWall(words, wall, home));
		return hit === undefined ? next(e) : { deny: wallReason(hit) };
	}).catch(($, e, next) => (fault($, "wall guard", next.error), next(e)));
}
