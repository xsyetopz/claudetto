import { readFile } from "node:fs/promises";
import { dirname, join, relative, sep } from "node:path";
import { spawn, TOML } from "bun";

export interface Rule {
	readonly id: string;
	readonly path: RegExp;
	readonly temp: boolean;
	readonly keep: readonly RegExp[];
}

export interface Trash {
	readonly rules: readonly Rule[];
	readonly keep: readonly RegExp[];
}

interface Entry {
	readonly name: string;
	isDirectory(): boolean;
}

export interface Found {
	readonly id: string;
	readonly path: string;
}

const DEFAULT_PATH = join(import.meta.dir, "trash.toml");
export const PROJECT_TRASH = ".claude/claudetto/trash.toml";

// Gitleaks writes Go regexes, where a leading `(?i)` sets the flag for the whole pattern.
const goRegex = (source: string): RegExp =>
	source.startsWith("(?i)")
		? new RegExp(source.slice(4), "i")
		: new RegExp(source);

const pathsOf = (lists: unknown): RegExp[] =>
	(Array.isArray(lists) ? lists : []).flatMap((list) =>
		(Array.isArray(list?.paths) ? list.paths : []).map(goRegex),
	);

const rulesOf = (file: string, raw: unknown): Rule[] =>
	(Array.isArray(raw) ? raw : []).map((rule, i) => {
		if (typeof rule?.id !== "string" || typeof rule?.path !== "string") {
			throw new Error(`${file}: rule ${i + 1} needs an id and a path`);
		}
		if (rule.regex !== undefined) {
			throw new Error(
				`${file}: rule ${rule.id} has a regex, but trash rules match folders by path only`,
			);
		}
		return {
			id: rule.id,
			path: goRegex(rule.path),
			temp: Array.isArray(rule.tags) && rule.tags.includes("temp"),
			keep: pathsOf(rule.allowlists),
		};
	});

const table = (value: unknown): Record<string, unknown> =>
	typeof value === "object" && value !== null
		? Object.fromEntries(Object.entries(value))
		: {};

const parsed = async (file: string) => {
	const config = table(TOML.parse(await readFile(file, "utf8")));
	const extend = table(config["extend"]);
	const disabled = extend["disabledRules"];
	return {
		rules: rulesOf(file, config["rules"]),
		keep: pathsOf(config["allowlists"]),
		useDefault: extend["useDefault"] === true,
		disabled: Array.isArray(disabled) ? disabled.map(String) : [],
	};
};

/** The project's trash file, or the plugin's, with a project file that extends the plugin's merged as gitleaks does. */
export const loadTrash = async (cwd: string): Promise<Trash> => {
	const base = await parsed(DEFAULT_PATH);
	const own = await parsed(join(cwd, PROJECT_TRASH)).catch((error) => {
		if (error?.code === "ENOENT") {
			return;
		}
		throw error;
	});
	if (own === undefined) {
		return base;
	}
	if (!own.useDefault) {
		return own;
	}
	const ids = new Set(own.rules.map((rule) => rule.id));
	return {
		rules: [
			...base.rules.filter(
				(rule) => !own.disabled.includes(rule.id) && !ids.has(rule.id),
			),
			...own.rules,
		],
		keep: [...base.keep, ...own.keep],
	};
};

const matchOf = (trash: Trash, temp: boolean, rel: string) =>
	trash.keep.some((re) => re.test(rel))
		? undefined
		: trash.rules.find(
				(rule) =>
					rule.temp === temp &&
					rule.path.test(rel) &&
					!rule.keep.some((re) => re.test(rel)),
			);

/** Each folder under `root` that a project rule names; the walk stops at a match and never enters `.git`. */
export const projectTrash = async (
	root: string,
	trash: Trash,
	list: (dir: string) => Promise<readonly Entry[]>,
): Promise<Found[]> => {
	const walk = async (dir: string): Promise<Found[]> => {
		const dirs = (await list(dir)).filter(
			(entry) => entry.isDirectory() && entry.name !== ".git",
		);
		const found = await Promise.all(
			dirs.map((entry) => {
				const path = join(dir, entry.name);
				const rule = matchOf(trash, false, relative(root, path));
				return rule ? [{ id: rule.id, path }] : walk(path);
			}),
		);
		return found.flat();
	};
	return walk(root);
};

/** The temp rule that names a top-level temp folder, or nothing. */
export const tempRule = (trash: Trash, name: string): Rule | undefined =>
	matchOf(trash, true, name);

/** The stdout of a command that exited 0, or nothing. */
export const output = async (
	argv: readonly string[],
	cwd: string,
): Promise<string | undefined> => {
	const child = spawn([...argv], {
		cwd,
		stdout: "pipe",
		stderr: "ignore",
	});
	const text = await new Response(child.stdout).text();
	return (await child.exited) === 0 ? text : undefined;
};

export interface Held {
	/** Working folders, which mark a whole checkout as in use. */
	readonly cwds: readonly string[];
	/** Every other open file, mapped library, or folder. */
	readonly files: readonly string[];
}

/** What the processes of `uid` hold open, except this one and Claude Code, which sits idle in the project; nothing when `lsof` fails. */
export const heldPaths = async (uid: number): Promise<Held | undefined> => {
	const text = await output(
		["lsof", "-nP", "-u", String(uid), "-Fpcfn"],
		"/",
	);
	if (text === undefined) {
		return undefined;
	}
	const cwds: string[] = [];
	const files: string[] = [];
	let skip = false;
	let cwd = false;
	for (const line of text.split("\n")) {
		const value = line.slice(1);
		if (line.startsWith("p")) {
			skip = Number(value) === process.pid;
		} else if (line.startsWith("c")) {
			skip ||= value === "claude";
		} else if (line.startsWith("f")) {
			cwd = value === "cwd";
		} else if (line.startsWith("n") && !skip) {
			(cwd ? cwds : files).push(value);
		}
	}
	return { cwds, files };
};

const within = (paths: readonly string[], dir: string) =>
	paths.some((p) => p === dir || p.startsWith(dir + sep));

/** The top folder of the git checkout holding `dir`, or nothing. */
export const checkoutOf = async (dir: string): Promise<string | undefined> =>
	(await output(["git", "rev-parse", "--show-toplevel"], dir))?.trim();

/** Why a project match must stay, or nothing: the session's own checkout, a process in its checkout or holding a file inside, a checkout used within the limit, content git does not ignore (a tracked file inside counts), or a recent change inside. */
export const keepReason = async (
	path: string,
	limitMs: number,
	held: Held,
	own: string | undefined,
): Promise<string | undefined> => {
	const top = await checkoutOf(dirname(path));
	if (top === undefined) {
		return "is not in a git checkout";
	}
	if (top === own) {
		return "is in the checkout this session works in";
	}
	if (within(held.cwds, top)) {
		return "has a process running in its checkout";
	}
	if (within(held.files, path)) {
		return "has a file a process holds open";
	}
	// Installs leave a dependency folder untouched for weeks while its checkout is in daily use, so the checkout's own activity decides too.
	const minutes = String(-Math.ceil(limitMs / 60_000));
	const index = (await output(["git", "rev-parse", "--git-path", "index"], top))?.trim();
	const used = await output(
		["find", index ?? "", "-mmin", minutes, "-print", "-quit"],
		top,
	);
	if (used !== "") {
		return "has a checkout used within the age limit";
	}
	if ((await output(["git", "check-ignore", "-q", path], top)) === undefined) {
		return "is not ignored by git";
	}
	const recent = await output(
		["find", path, "-mmin", minutes, "-print", "-quit"],
		top,
	);
	return recent === "" ? undefined : "changed within the age limit";
};
