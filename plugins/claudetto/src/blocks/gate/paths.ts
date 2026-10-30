import { GLOB_WORD_MAX } from "./limits.ts";
import { baseName } from "./shell/wrappers.ts";

export interface Places {
	cwd: string;
	home: string;
	tmp: string;
	temps: readonly string[];
}

export const SYSTEM_DIRS = ["/System", "/Library", "/usr"];
export const SYSTEM_OPEN = ["/usr/local"];
export const ENV_FILE =
	/^(?:\.env(?:[._-](?!(?:example|sample|template)$)[\w.-]+)?|[\w.-]*\.env|\.envrc)$/;
export const HOME_SECRETS = [
	".ssh/",
	".gnupg/",
	".aws/credentials",
	".netrc",
	".docker/config.json",
];

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
const SEGMENT_SEPARATOR = /[/=:,]/;
const GLOB_PART_START = /^[*?[]/;
const WHITESPACE = /\s/;
const VARIABLE_OR_BACKTICK = /[$`]/;

const expand = (word: string, at: Places): string =>
	word
		.replace(TILDE_HOME, at.home)
		.replace(TILDE_USER, (_, name: string) => homeOf(name, at))
		.replace(HOME_VARIABLE, at.home)
		.replace(TMPDIR_VARIABLE, at.tmp);

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

export const inTmp = (path: string, at: Places): boolean =>
	at.temps.some((root) => path !== root && under(path, root));

export const isSystem = (path: string): boolean =>
	SYSTEM_DIRS.some((root) => under(path, root)) &&
	!SYSTEM_OPEN.some((root) => under(path, root));

const homeRel = (path: string, at: Places): string | undefined => {
	if (under(path, at.home)) {
		return path.slice(at.home.length + 1);
	}
	const m = HOME_FOLDER_PATH.exec(path);
	return m === null ? undefined : (m[1] ?? "");
};

const REBUILT = new Set([
	"node_modules",
	"dist",
	"build",
	"out",
	"target",
	"coverage",
	".next",
	".nuxt",
	".turbo",
	".cache",
	".parcel-cache",
	".build",
	"DerivedData",
	"__pycache__",
	".pytest_cache",
	".mypy_cache",
	".ruff_cache",
	".venv",
	".gradle",
]);

export const userFile = (path: string, at: Places): boolean =>
	homeRel(path, at) !== undefined &&
	!under(path, at.cwd) &&
	!inTmp(path, at) &&
	!path.split("/").some((part) => REBUILT.has(part));

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

export const namesSecret = (dir: string, word: string, at: Places): boolean =>
	(SECRET_NAME_HINT.test(word) || dir.includes("/.")) &&
	[word, ...word.split(LIST_SEPARATOR)].some((part) => {
		const path = pathOf(dir, part, at);
		return path !== null && isSecretPath(path, at);
	});

const ENV_SAMPLES = [
	".env",
	".env.local",
	".envrc",
	".env-prod",
	".env_prod",
	"prod.env",
];

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

export const globsSecret = (dir: string, word: string, at: Places): boolean => {
	if (!GLOB_START.test(word) || WHITESPACE.test(word)) {
		return false;
	}
	if (word.split(SEGMENT_SEPARATOR).some((s) => s.length > GLOB_WORD_MAX)) {
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

export const codeSecret = (code: string): string | undefined =>
	[...code.matchAll(/(?<![\w.$)\]`-])\.env(?:rc|[._-][\w.-]+)?(?![\w.(-])/g)]
		.map((m) => m[0])
		.find((name) => ENV_FILE.test(name));
