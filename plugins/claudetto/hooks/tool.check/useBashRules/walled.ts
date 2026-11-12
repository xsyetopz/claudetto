import { gateWalled } from "../../texts-gate.ts";
import { baseName } from "./program-at.ts";
import { flatten } from "./recreate.ts";
import { parse, programOf } from "./shell-words.ts";
import { deny, fieldOf, type Verdict } from "./verdict.ts";

const HOME = /^(?:~|\$HOME|\$\{HOME\})(?=\/|$)/u;
const DENY_READ = /^Read\((.+)\/\*\*\)$/u;
// A Glob pattern is relative to its `path`.
const FILE_FIELDS: Readonly<Record<string, readonly string[]>> = {
	Read: ["file_path"],
	Grep: ["path"],
	Glob: ["path", "pattern"],
};

/** A path the call names as written, and the `cd` targets before it, in order. */
export interface Named {
	path: string;
	dirs: readonly string[];
}

/** `~` and `$HOME` become the home folder, a relative path joins `at`, and `.` and `..` fold. */
const placed = (path: string, home: string, at: string): string => {
	const expanded = path.replace(HOME, home);
	return flatten(expanded.startsWith("/") ? expanded : `${at}/${expanded}`);
};

/** The paths a file tool or a shell command names: each word, the value after a `=`, and each redirect target, with the `cd` targets before it. */
export const namedPaths = (tool: string, input: unknown): Named[] => {
	const command = fieldOf(input, "command");
	if ((tool === "Bash" || tool === "Monitor") && command !== undefined) {
		let dirs: string[] = [];
		return parse(command).commands.flatMap((c) => {
			const at = dirs;
			const { name, args } = programOf(c);
			if (name === "cd" && args[0] !== "-") {
				dirs = [...dirs, args[0] ?? "~"];
			}
			return [
				...c.words.flatMap((w) => [w, w.slice(w.indexOf("=") + 1)]),
				...c.redirects.map((r) => r.target),
			].map((word) => ({ path: word, dirs: at }));
		});
	}
	const root = fieldOf(input, "path");
	const fields = (FILE_FIELDS[tool] ?? []).map((key) => fieldOf(input, key));
	return fields
		.filter((f) => f !== undefined)
		.map((f) => ({
			path: f,
			dirs: f === root || root === undefined ? [] : [root],
		}));
};

/** Whether a named path spells a wall's last name; a call that spells none cannot reach one, so it costs no home lookup. A `cd` target is a named path of its own. */
export const spellsWall = (
	walls: readonly string[],
	named: readonly Named[],
): boolean =>
	walls.some((w) => {
		const name = baseName(flatten(w));
		return named.some((n) => n.path.includes(name));
	});

/** Denies a call that names a path under a wall. */
export const walledVerdict = (
	named: readonly Named[],
	walls: readonly string[],
	home: string,
	cwd: string,
): Verdict | undefined => {
	for (const n of named) {
		let dir = cwd;
		for (const d of n.dirs) {
			dir = placed(d, home, dir);
		}
		const at = placed(n.path, home, dir);
		const wall = walls.find((w) => {
			const top = placed(w, home, "/");
			return at === top || at.startsWith(`${top}/`);
		});
		if (wall !== undefined) {
			return deny(gateWalled(n.path, wall));
		}
	}
	return undefined;
};

/** The `Read(<wall>/**)` rule `unguarded` accepts: `~/` for a home path, `//` for any other, which the gate places from `/`. */
export const wallRule = (wall: string): string => {
	const home = HOME.exec(wall)?.[0];
	const rest = flatten(home === undefined ? wall : wall.slice(home.length));
	return `Read(${home === undefined ? "/" : "~"}${rest}/**)`;
};

/** The walls the settings' `permissions.deny` holds no `Read(<wall>/**)` for, in its `~/` or `//` absolute form. */
export const unguarded = (
	walls: readonly string[],
	permissions: unknown,
	home: string,
): string[] => {
	const rules =
		typeof permissions === "object" &&
		permissions !== null &&
		"deny" in permissions &&
		Array.isArray(permissions.deny)
			? permissions.deny
			: [];
	const guarded = new Set(
		rules.flatMap((r: unknown) => {
			const body = typeof r === "string" ? DENY_READ.exec(r)?.[1] : undefined;
			if (body === undefined) {
				return [];
			}
			if (body.startsWith("//")) {
				return [flatten(body)];
			}
			return HOME.test(body) ? [placed(body, home, "/")] : [];
		}),
	);
	return walls.filter((w) => !guarded.has(placed(w, home, "/")));
};
