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
		// Every spelling ends in the wall's last part, so a command without it needs no home lookup.
		const command = e.command;
		if (!walls.some((wall) => command.includes(wall.replace(/^.*\//u, "")))) return next(e);
		const home = await $.env.get("HOME");
		const hit = walls.find((wall) => wallNames(wall, home).some((name) => command.includes(name)));
		return hit === undefined ? next(e) : { deny: wallReason(hit) };
	}).catch(($, e, next) => (fault($, "wall guard", next.error), next(e)));
}
