// The path facts of the permission gate: where a word of a command points, and what kind of folder holds it.

import { baseName } from "../../shell/domain/wrappers.ts";
import { GLOB_WORD_MAX } from "../limits.ts";

/** The folders of the session: the project, the home folder, `$TMPDIR`, and each spelling of each temp folder of `modules/project/domain/tmp.ts`. */
export interface Places {
	cwd: string;
	home: string;
	tmp: string;
	temps: readonly string[];
}

/** The folders of the system that the gate keeps from each write, and that setup lists in `sandbox.filesystem.denyWrite`. */
export const SYSTEM_DIRS = ["/System", "/Library", "/usr"];
/** The folders inside `SYSTEM_DIRS` that are not system folders: Homebrew writes to `/usr/local`. */
export const SYSTEM_OPEN = ["/usr/local"];
/** The names of an env file: `.env`, `.env.local`, `.env-prod`, `.env_prod`, `prod.env`, and `.envrc`, but not `.env.example`, `.env.sample`, or `.env.template`. */
export const ENV_FILE =
	/^(?:\.env(?:[._-](?!(?:example|sample|template)$)[\w.-]+)?|[\w.-]*\.env|\.envrc)$/;
/** The secret paths below the home folder, which the gate keeps from each read, and that setup lists in `sandbox.filesystem.denyRead`. A name with a `/` at the end is a folder. */
export const HOME_SECRETS = [
	".ssh/",
	".gnupg/",
	".aws/credentials",
	".netrc",
	".docker/config.json",
];

/** The normal form of the absolute path `path`, with no `.`, no `..`, and no empty part. */
const normal = (path: string): string => {
	const parts: string[] = [];
	for (const part of path.split("/")) {
		if (part === "..") {
			parts.pop();
		} else if (part !== "" && part !== ".") {
			parts.push(part);
		}
	}
	return `/${parts.join("/")}`;
};

/** The home folder of the user `name`: the home folder of the session for its own name, `/var/root` for `root`, and a sibling folder of the home folder for another name (`/home` when the home folder is at the root). */
const homeOf = (name: string, at: Places): string => {
	if (name === baseName(at.home)) {
		return at.home;
	}
	if (name === "root") {
		return "/var/root";
	}
	const parent = at.home.slice(0, at.home.lastIndexOf("/")) || "/home";
	return `${parent}/${name}`;
};

const TILDE_HOME = /^~(?=\/|$)/;
const TILDE_USER = /^~([\w.-]+)(?=\/|$)/;
const HOME_VARIABLE = /^\$(?:HOME|\{HOME\})(?=\/|$)/;
const TMPDIR_VARIABLE = /^\$(?:TMPDIR|\{TMPDIR\})(?=\/|$)/;
const UNREADABLE_WORD = /[$`]|\{\}/;
const GLOB_START = /[*?[]/;
const HOME_FOLDER_PATH =
	/^\/(?:(?:Users|home)\/[^/]+|root|var\/root)(?:\/(.*))?$/;
const SECRET_NAME_HINT = /[.$~]/;
const LIST_SEPARATOR = /[=:,]/;
const GLOB_PART_START = /^[*?[]/;
const WHITESPACE = /\s/;
const VARIABLE_OR_BACKTICK = /[$`]/;

/** The word `word` with `~`, `~name`, `$HOME`, and `$TMPDIR` at its start replaced. */
const expand = (word: string, at: Places): string =>
	word
		.replace(TILDE_HOME, at.home)
		.replace(TILDE_USER, (_, name: string) => homeOf(name, at))
		.replace(HOME_VARIABLE, at.home)
		.replace(TMPDIR_VARIABLE, at.tmp);

/**
 * The absolute path of the word `word` from the folder `dir`, or `null` when the gate cannot read it:
 * an empty word, or a word with a variable, a backtick, or `{}` after the expansion of `~`, `$HOME`, and `$TMPDIR`.
 * A glob part and each part after it are cut, so `src/*.ts` points to `src`.
 */
export const pathOf = (
	dir: string,
	word: string,
	at: Places,
): string | null => {
	const text = expand(word, at);
	if (text === "" || UNREADABLE_WORD.test(text)) {
		return null;
	}
	const glob = text.search(GLOB_START);
	const plain =
		glob < 0 ? text : text.slice(0, text.lastIndexOf("/", glob) + 1);
	return normal(plain.startsWith("/") ? plain : `${dir}/${plain}`);
};

const under = (path: string, root: string): boolean =>
	path === root || path.startsWith(root === "/" ? "/" : `${root}/`);

/** True when `path` is in the temp folder, but is not the temp folder itself. */
export const inTmp = (path: string, at: Places): boolean =>
	at.temps.some((root) => path !== root && under(path, root));

export const isSystem = (path: string): boolean =>
	SYSTEM_DIRS.some((root) => under(path, root)) &&
	!SYSTEM_OPEN.some((root) => under(path, root));

/** The part of `path` below a home folder: the home folder of the session, or `/Users/<name>`, `/home/<name>`, `/root`, and `/var/root`. `undefined` when `path` is in no home folder. */
const homeRel = (path: string, at: Places): string | undefined => {
	if (under(path, at.home)) {
		return path.slice(at.home.length + 1);
	}
	const m = HOME_FOLDER_PATH.exec(path);
	return m === null ? undefined : (m[1] ?? "");
};

const isSecretPath = (path: string, at: Places): boolean => {
	const rel = homeRel(path, at);
	return (
		ENV_FILE.test(baseName(path)) ||
		(rel !== undefined &&
			HOME_SECRETS.some((s) =>
				s.endsWith("/")
					? rel === s.slice(0, -1) || rel.startsWith(s)
					: rel === s,
			))
	);
};

/** True when `word` points to a secret file from the folder `dir`. Each secret name has a `.`, so a word with no `.`, `$`, or `~` in a folder with no `/.` part cannot name one. */
export const namesSecret = (dir: string, word: string, at: Places): boolean =>
	(SECRET_NAME_HINT.test(word) || dir.includes("/.")) &&
	[word, ...word.split(LIST_SEPARATOR)].some((part) => {
		const path = pathOf(dir, part, at);
		return path !== null && isSecretPath(path, at);
	});

/** The names that a glob is tested against for an env file: one spelling of each form of `ENV_FILE`. */
const ENV_SAMPLES = [
	".env",
	".env.local",
	".envrc",
	".env-prod",
	".env_prod",
	"prod.env",
];

/** The regular expression of one glob part: `*` and `?` stop at `/`, `[!a]` is `[^a]`, and a part that starts with a wildcard does not match a name that starts with `.`. `undefined` for a part that is no valid expression. */
const partRe = (part: string): RegExp | undefined => {
	const source = part.replace(
		/\[!?\]?[^\]]*\]|[*?]|[.+^${}()|\\[\]]/g,
		(tok) => {
			if (tok === "*") {
				return "[^/]*";
			}
			if (tok === "?") {
				return "[^/]";
			}
			if (tok.length > 1) {
				return tok[1] === "!" ? `[^${tok.slice(2)}` : tok;
			}
			return `\\${tok}`;
		},
	);
	try {
		return new RegExp(
			`^${GLOB_PART_START.test(part) ? "(?!\\.)" : ""}${source}$`,
		);
	} catch {
		return undefined;
	}
};

const partMatches = (part: string, name: string): boolean =>
	partRe(part)?.test(name) ?? false;

/** The parts of the absolute path of the glob `glob` from `dir`, with `..` resolved. */
const partsOf = (dir: string, glob: string, at: Places): string[] => {
	const text = expand(glob, at);
	const parts: string[] = [];
	const full = text.startsWith("/") ? text : `${dir}/${text}`;
	for (const part of full.split("/")) {
		if (part === "..") {
			parts.pop();
		} else if (part !== "" && part !== ".") {
			parts.push(part);
		}
	}
	return parts;
};

/** True when the glob `parts` can match the secret `secret`. A folder secret also matches a glob that goes below it. */
const matchesPath = (
	parts: string[],
	secret: string[],
	folder: boolean,
): boolean => {
	if (!folder && parts.length !== secret.length) {
		return false;
	}
	const n = folder ? Math.min(parts.length, secret.length) : secret.length;
	return secret
		.slice(0, n)
		.every((name, i) => partMatches(parts[i] ?? "", name));
};

/**
 * True when `word` has a glob that can match a secret file from the folder `dir`: an env file name, or a path of `HOME_SECRETS`.
 * A last part of only wildcards, such as the `*` of `cat *`, does not count as a match of an env file, because it can match any name.
 * A word with a space is a pattern or an expression, not a glob. A word over `GLOB_WORD_MAX` characters counts as a match.
 */
export const globsSecret = (dir: string, word: string, at: Places): boolean => {
	if (!GLOB_START.test(word) || WHITESPACE.test(word)) {
		return false;
	}
	if (word.length > GLOB_WORD_MAX) {
		return true;
	}
	const home = at.home.split("/").filter(Boolean);
	return [word, ...word.split(LIST_SEPARATOR)].some((part) => {
		if (!GLOB_START.test(part) || VARIABLE_OR_BACKTICK.test(part)) {
			return false;
		}
		const parts = partsOf(dir, part, at);
		const last = parts.at(-1) ?? "";
		const literal = last.replace(/[*?[\]!]/g, "") !== "";
		return (
			(literal && ENV_SAMPLES.some((n) => partMatches(last, n))) ||
			HOME_SECRETS.some((s) =>
				matchesPath(
					parts,
					[...home, ...s.split("/").filter(Boolean)],
					s.endsWith("/"),
				),
			)
		);
	});
};

// `$`, `)`, `]`, and a backtick before `.env`, or a `(` after it, make a property access or a call, such as `$.env.get` or `` `cmd`.env(env) ``, not a file name.
export const codeSecret = (code: string): string | undefined =>
	[...code.matchAll(/(?<![\w.$)\]`-])\.env(?:rc|[._-][\w.-]+)?(?![\w.(-])/g)]
		.map((m) => m[0])
		.find((name) => ENV_FILE.test(name));
