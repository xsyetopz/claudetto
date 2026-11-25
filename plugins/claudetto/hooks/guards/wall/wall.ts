import type { EngineInterface, On, PluginOptions } from "claude-code";

import { fault } from "../../shared/fault";
import { stringsOf } from "../../shared/field";
import { globHitsWall, globWords, ROOT } from "./glob";
import { WALLS } from "./rules";

/** `${HOME}`, spelled in parts so the text is not read as a template placeholder. */
const HOME_BRACED = ["$", "{HOME}"].join("");

/**
 * The spellings of a wall a shell command can name: a `~/` path also appears
 * as `$HOME/`, `${HOME}/` and the expanded home folder.
 *
 * @param wall A protected path as `protectedPaths` holds it.
 * @param home The home folder, or undefined when the engine reports none.
 * @returns Each text whose presence in a command names the wall.
 */
export const wallNames = (wall: string, home: string | undefined): string[] => {
	const tail =
		/^(?:~|\$HOME|\$\{HOME\})\//u.exec(wall) === null
			? undefined
			: wall.replace(/^[^/]+\//u, "");
	if (tail === undefined) {
		return [wall];
	}
	return [
		"~/",
		"$HOME/",
		`${HOME_BRACED}/`,
		...(home === undefined ? [] : [`${home}/`])
	].map((root) => `${root}${tail}`);
};

/** The home folder, or undefined after a failed read, which is logged. */
async function homeOf($: EngineInterface): Promise<string | undefined> {
	let home: string | undefined;
	try {
		home = await $.env.get("HOME");
	} catch (error) {
		fault($, "wall home", error);
	}
	return home;
}

/** Whether the session runs in home, so a relative path is read from there; false after a failed read, which is logged. */
async function runsInHome(
	$: EngineInterface,
	home: string | undefined
): Promise<boolean> {
	if (home === undefined) {
		return false;
	}
	try {
		const cwd = await $.session.cwd();
		return cwd.replace(/\/+$/u, "") === home.replace(/\/+$/u, "");
	} catch (error) {
		fault($, "wall cwd", error);
		return false;
	}
}

/** Whether the command moves to home first (`cd`, `cd ~`, `cd $HOME`), so a relative glob is read from there. */
const movesHome = (command: string, home: string | undefined): boolean => {
	const target = [
		"~",
		"$HOME",
		HOME_BRACED,
		...(home === undefined ? [] : [home])
	]
		.map((t) => t.replaceAll(/[$^{}.*+?()[\]|\\/]/gu, String.raw`\$&`))
		.join("|");
	return new RegExp(
		`(?:^|[;&|({\\n]\\s*)(?:cd|pushd)(?:\\s+["']?(?:${target})/?["']?)?\\s*(?:$|[;&|)])`,
		"u"
	).test(command);
};

/** `$(echo X)` and backtick echoes whose body is plain text, so the value is known before the shell runs. */
const LITERAL_ECHO =
	/\$\(\s*(?:echo|printf)\s+(?:-[neE]+\s+)?([^$`;&|()<>\\]*)\)|`\s*(?:echo|printf)\s+(?:-[neE]+\s+)?([^$`;&|()<>\\]*)`/gu;
const ASSIGNMENT =
	/(?:^|[;&|(\n\s])(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=("[^"$`\\]*"|'[^']*'|[^\s;&|()"'$`\\]*)/gu;
const VARIABLE =
	/\$(?:\{([A-Za-z_][A-Za-z0-9_]*)\}|([A-Za-z_][A-Za-z0-9_]*))/gu;

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
		text = text.replaceAll(
			LITERAL_ECHO,
			(_m, a: string | undefined, b: string | undefined) =>
				(a ?? b ?? "").replaceAll(/["']/gu, "").trim()
		);
		for (const m of text.matchAll(ASSIGNMENT)) {
			const name = m[1] ?? "";
			if (name !== "HOME") {
				vars.set(name, (m[2] ?? "").replaceAll(/["']/gu, ""));
			}
		}
		const next = text.replaceAll(
			VARIABLE,
			(whole, a: string | undefined, b: string | undefined) =>
				vars.get(a ?? b ?? "") ?? whole
		);
		if (next === text) {
			break;
		}
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
	for (let prev = ""; prev !== out;) {
		prev = out;
		out = out
			.replaceAll(/\/(?:\.\/)+/gu, "/")
			.replaceAll(/\/{2,}/gu, "/")
			.replaceAll(/\/(?!\.\.\/)[^/\s"';&|()<>]+\/\.\.(?=\/)/gu, "");
	}
	return out;
};

const escapeRegExp = (text: string): string =>
	text.replaceAll(/[$^{}.*+?()[\]|\\/]/gu, String.raw`\$&`);

/**
 * Whether the text names the path itself and not a sibling that shares its
 * name as a prefix: `~/.claudetto-holdout/t` and `~/.claudetto-holdout*` name
 * the wall, `~/.claudetto-holdout-old` does not.
 */
export const namesPath = (text: string, name: string): boolean =>
	new RegExp(`${escapeRegExp(name)}(?=$|[/\\s"';&|)<>*?[{\`])`, "u").test(text);

/**
 * Whether the wall's folder is built at run time, so its name cannot be read
 * before the command runs: a home-rooted path whose first folder is dynamic
 * (`~/$x`, `$HOME/$(cmd)`), or a dynamic part followed by the wall's last
 * folder (`$(cmd)/.claudetto-holdout`). Folders deeper than the wall's depth
 * (`~/.config/$x`) are left alone.
 */
export const dynamicWall = (
	text: string,
	wall: string,
	home: string | undefined
): boolean => {
	const roots = [
		"~",
		"$HOME",
		HOME_BRACED,
		...(home === undefined ? [] : [home])
	]
		.map((root) => escapeRegExp(root))
		.join("|");
	const dynamic = "(?:\\$\\(|`|\\$\\{?[A-Za-z_@*#?!0-9])";
	const atRoot = new RegExp(
		`(?:^|[\\s"'=:(])(?:${roots})/[^\\s/"']*${dynamic}`,
		"u"
	);
	const last = escapeRegExp(wall.replace(/^.*\//u, ""));
	const beforeName = new RegExp(
		`(?:\\)|\`|\\$\\{?[A-Za-z_][A-Za-z0-9_]*\\}?)/${last}(?:[\\s/"';&|)]|$)`,
		"u"
	);
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
	const walls = stringsOf(held) ?? WALLS;
	if (walls.length === 0) {
		return;
	}
	on("tool.call", { tool: "Bash" }, async ($, e, next) => {
		if (e.tool !== "Bash") {
			return next(e);
		}
		// A spelled wall ends in its last part; only a glob, a variable or a substitution can name a wall without it.
		const command = e.command;
		const text = foldPaths(expandStatic(command));
		const words = globWords(text);
		const named = walls.some(
			(wall) =>
				text.includes(wall.replace(/^.*\//u, "")) ||
				command.includes(wall.replace(/^.*\//u, ""))
		);
		if (words.length === 0 && !named && !/[$`]/u.test(text)) {
			return next(e);
		}
		// Without a home the `~/` and `$HOME/` spellings and globs still match; only the expanded one is lost.
		const home = await homeOf($);
		const atHome = movesHome(text, home) || (await runsInHome($, home));
		// After a move to home, a plain relative word names a folder of home as much as a glob does.
		const reach = atHome
			? text
					.split(/[\s;&|()<>]+/u)
					.map((w) => w.replaceAll(/["']/gu, ""))
					.filter(Boolean)
			: words;
		const hit = walls.find(
			(wall) =>
				[command, text].some((t) =>
					wallNames(wall, home).some((name) => namesPath(t, name))
				) ||
				globHitsWall(reach, wall, home, atHome) ||
				dynamicWall(text, wall, home)
		);
		return hit === undefined ? next(e) : { deny: wallReason(hit) };
	}).catch(($, e, next) => {
		fault($, "wall guard", next.error);
		return next(e);
	});
}
