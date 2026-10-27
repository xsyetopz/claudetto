// The search tools for a build with no `Grep` and no `Glob` (task 19.14): the input, the argv of each search program, and the output.
// `rg` is the first choice, then `ugrep` and `grep` for `grep`, and `find` for `glob`.
// Each argv skips `.git` and the `.env` files, and the secret-read rule of `gate` denies a call that names one.

import type { ToolSpec } from "claude-code";
import {
	CONTEXT_MAX,
	GLOB_RESULTS_MAX,
	HEAD_LIMIT_DEFAULT,
	RESULT_CHARS_MAX,
} from "../limits.ts";
import {
	BAD_INPUT,
	CUT,
	GLOB_FIELDS,
	GREP_FIELDS,
	MORE,
	NO_FILES,
	NO_MATCHES,
	TOOL_GLOB,
	TOOL_GREP,
} from "../prompts.ts";

export const GREP_TOOL = "mcp__claudetto__grep";
export const GLOB_TOOL = "mcp__claudetto__glob";

/** The field of each tool that holds a glob, for the secret-read rule of `gate`: the built-in and the claudetto tool of a kind share it. A tool that is not here has `pattern`. */
export const GLOB_FIELD: Readonly<Record<string, string>> = {
	Grep: "glob",
	[GREP_TOOL]: "glob",
};

export const GREP_PROGRAMS = ["rg", "ugrep", "grep"] as const;
export const GLOB_PROGRAMS = ["rg", "find"] as const;
export type GrepProgram = (typeof GREP_PROGRAMS)[number];
export type GlobProgram = (typeof GLOB_PROGRAMS)[number];

/** The argv that shows if `program` runs on the host. */
export const probeArgv = (program: string): string[] =>
	program === "find" ? ["find", ".", "-maxdepth", "0"] : [program, "--version"];

const MODES = ["files_with_matches", "content", "count"] as const;
type Mode = (typeof MODES)[number];
const DEFAULT_MODE: Mode = "files_with_matches";

/** The names that no search returns: the VCS folder and the files of `gate` `namesSecret` (`.env` and `.env.*`). */
const VCS = ".git";
const SECRETS = [".env", ".env.*"];

const isText = (v: unknown): boolean => typeof v === "string";
const isFlag = (v: unknown): boolean => typeof v === "boolean";
const isCount = (max: number) => (v: unknown) =>
	typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= max;
const lines = isCount(CONTEXT_MAX);
const entries = isCount(Number.MAX_SAFE_INTEGER);

/** The test of each field of the input. Only `pattern` is required. */
const CHECKS: Readonly<Record<string, (v: unknown) => boolean>> = {
	pattern: (v) => isText(v) && v !== "",
	path: isText,
	glob: isText,
	output_mode: (v) => MODES.some((mode) => mode === v),
	"-B": lines,
	"-A": lines,
	"-C": lines,
	context: lines,
	"-n": isFlag,
	"-i": isFlag,
	"-o": isFlag,
	head_limit: entries,
	offset: entries,
};

/** The input of `grep`, with the defaults of the built-in `Grep`. */
export interface GrepInput {
	readonly pattern: string;
	readonly path: string | undefined;
	readonly glob: string | undefined;
	readonly mode: Mode;
	readonly before: number | undefined;
	readonly after: number | undefined;
	readonly around: number | undefined;
	readonly numbers: boolean;
	readonly ignoreCase: boolean;
	readonly only: boolean;
	readonly headLimit: number;
	readonly offset: number;
}

/** The input of `grep` from the fields of a call, or the text of the fault when a field is missing or wrong. */
export const parseGrep = (raw: Record<string, unknown>): GrepInput | string => {
	const bad = Object.entries(CHECKS).find(
		([key, ok]) =>
			(key === "pattern" || raw[key] !== undefined) && !ok(raw[key]),
	);
	if (bad) {
		return BAD_INPUT({ field: bad[0] });
	}
	const text = (key: string) => {
		const value = raw[key];
		return typeof value === "string" ? value : undefined;
	};
	const count = (key: string) => {
		const value = raw[key];
		return typeof value === "number" ? value : undefined;
	};
	return {
		pattern: text("pattern") ?? "",
		path: text("path"),
		glob: text("glob"),
		mode: MODES.find((mode) => mode === text("output_mode")) ?? DEFAULT_MODE,
		before: count("-B"),
		after: count("-A"),
		around: count("-C") ?? count("context"),
		numbers: raw["-n"] !== false,
		ignoreCase: raw["-i"] === true,
		only: raw["-o"] === true,
		headLimit: count("head_limit") ?? HEAD_LIMIT_DEFAULT,
		offset: count("offset") ?? 0,
	};
};

const flagged = (flag: string, n: number | undefined): string[] =>
	n === undefined ? [] : [flag, String(n)];

/** The mode flags of `i`. `-H` keeps the file name when the path is one file. */
const modeFlags = (i: GrepInput): string[] => {
	if (i.mode === "files_with_matches") {
		return ["-l"];
	}
	if (i.mode === "count") {
		return ["-H", "-c"];
	}
	return [
		"-H",
		...(i.numbers ? ["-n"] : []),
		...(i.only ? ["-o"] : []),
		...flagged("-B", i.before),
		...flagged("-A", i.after),
		...flagged("-C", i.around),
	];
};

/** The argv of `grep` for `program`. The pattern follows `-e`, and the path follows `--`, so that neither reads as an option. */
export const grepArgv = (program: GrepProgram, i: GrepInput): string[] => {
	const shared = [...(i.ignoreCase ? ["-i"] : []), ...modeFlags(i)];
	const end = ["-e", i.pattern, "--", i.path ?? "."];
	// The excludes follow the glob of the input, because the last glob of `rg` wins.
	return program === "rg"
		? [
				"rg",
				"--no-config",
				"--hidden",
				"--no-heading",
				"--color=never",
				...(i.glob === undefined ? [] : ["--glob", i.glob]),
				...[VCS, ...SECRETS].flatMap((name) => ["--glob", `!${name}`]),
				...shared,
				...end,
			]
		: [
				program,
				"-r",
				"-E",
				"-I",
				`--exclude-dir=${VCS}`,
				...SECRETS.map((name) => `--exclude=${name}`),
				...(i.glob === undefined ? [] : [`--include=${i.glob}`]),
				...shared,
				...end,
			];
};

/** `text`, cut at `RESULT_CHARS_MAX`. */
const bounded = (text: string): string =>
	text.length > RESULT_CHARS_MAX
		? `${text.slice(0, RESULT_CHARS_MAX)}\n${CUT}`
		: text;

const ZERO_COUNT = /:0$/;
const LEADING_DOT_SLASH = /^\.\//;
const LEADING_BANG = /^!/;
const DIRECTORY_PART = /^.*\//;
const TRAILING_SLASHES = /\/+$/;
const NEVER_MATCHES = /$^/;

/** The lines of a run with no `./` in front, with the `:0` counts of `grep -c` left out when `counts` is true. */
const linesOf = (stdout: string, counts = false): string[] =>
	stdout
		.split("\n")
		.filter((line) => line !== "" && !(counts && ZERO_COUNT.test(line)))
		.map((line) => line.replace(LEADING_DOT_SLASH, ""));

/** The text that `grep` returns for the output `stdout` of a run: the entries from `offset`, at most `head_limit`, and the count that is left. */
export const grepOutput = (stdout: string, i: GrepInput): string => {
	const all = linesOf(stdout, i.mode === "count");
	const end = i.headLimit === 0 ? undefined : i.offset + i.headLimit;
	const shown = all.slice(i.offset, end);
	const left = end === undefined ? 0 : Math.max(0, all.length - end);
	return shown.length === 0
		? NO_MATCHES
		: bounded(
				[...shown, ...(left > 0 ? [MORE({ count: left })] : [])].join("\n"),
			);
};

/** The argv that lists each file under the folder of the run. */
export const globArgv = (program: GlobProgram): string[] =>
	program === "rg"
		? [
				"rg",
				"--no-config",
				"--files",
				"--hidden",
				...[VCS, ...SECRETS].flatMap((name) => ["--glob", `!${name}`]),
			]
		: [
				"find",
				".",
				"-type",
				"f",
				"-not",
				"-path",
				`*/${VCS}/*`,
				...SECRETS.flatMap((name) => ["-not", "-name", name]),
			];

const escaped = (text: string): string =>
	text.replace(/[.+^$()|\\[\]{}]/g, "\\$&");

/** The parts of a glob: `**` crosses folders, `*` and `?` stay in one part, `{a,b}` is a choice, and `[ab]` is a class. Each other character is a part. */
const TOKEN = /\*\*\/|\*\*|\*|\?|\[[^\]]+\]|\{[^{}]*\}|[^*?[{]+|[[{]/g;

const source = (glob: string): string =>
	glob.replace(TOKEN, (token) => {
		if (token === "**/") {
			return "(?:.*/)?";
		}
		if (token === "**") {
			return ".*";
		}
		if (token === "*") {
			return "[^/]*";
		}
		if (token === "?") {
			return "[^/]";
		}
		if (token.length > 2 && token.startsWith("{") && token.endsWith("}")) {
			return `(?:${token.slice(1, -1).split(",").map(source).join("|")})`;
		}
		if (token.length > 2 && token.startsWith("[") && token.endsWith("]")) {
			return `[${token.slice(1, -1).replace(LEADING_BANG, "^").replace(/\\/g, "\\\\")}]`;
		}
		return escaped(token);
	});

/** The order of the default `sort`: by UTF-16 code unit, with no locale. */
const byCodeUnit = (a: string, b: string): number => {
	if (a < b) {
		return -1;
	}
	return a > b ? 1 : 0;
};

const globRegex = (glob: string): RegExp => {
	try {
		return new RegExp(`^${source(glob)}$`);
	} catch {
		return NEVER_MATCHES;
	}
};

/** The text that `glob` returns for the file list `stdout` of a run in `dir`: the sorted files that match `pattern`, as absolute paths, at most `GLOB_RESULTS_MAX`. A pattern with no `/` matches the file name. */
export const globOutput = (
	stdout: string,
	pattern: string,
	dir: string,
): string => {
	const wanted = pattern.replace(LEADING_DOT_SLASH, "");
	const re = globRegex(wanted);
	const found = linesOf(stdout)
		.filter((file) =>
			re.test(wanted.includes("/") ? file : file.replace(DIRECTORY_PART, "")),
		)
		.sort(byCodeUnit);
	const root = dir.replace(TRAILING_SLASHES, "");
	return found.length === 0
		? NO_FILES
		: bounded(
				[
					...found.slice(0, GLOB_RESULTS_MAX).map((file) => `${root}/${file}`),
					...(found.length > GLOB_RESULTS_MAX
						? [MORE({ count: found.length - GLOB_RESULTS_MAX })]
						: []),
				].join("\n"),
			);
};

/** The JSON schema of a field that is not a string. */
const FIELD_TYPE: Readonly<Record<string, Record<string, unknown>>> = {
	output_mode: { type: "string", enum: MODES },
	"-B": { type: "integer", minimum: 0, maximum: CONTEXT_MAX },
	"-A": { type: "integer", minimum: 0, maximum: CONTEXT_MAX },
	"-C": { type: "integer", minimum: 0, maximum: CONTEXT_MAX },
	context: { type: "integer", minimum: 0, maximum: CONTEXT_MAX },
	"-n": { type: "boolean" },
	"-i": { type: "boolean" },
	"-o": { type: "boolean" },
	head_limit: { type: "integer", minimum: 0 },
	offset: { type: "integer", minimum: 0 },
};

const toolSpec = (
	name: string,
	description: string,
	fields: Readonly<Record<string, string>>,
): ToolSpec => ({
	name,
	description,
	inputSchema: {
		type: "object",
		properties: Object.fromEntries(
			Object.entries(fields).map(([key, text]) => [
				key,
				{ type: "string", ...FIELD_TYPE[key], description: text },
			]),
		),
		required: ["pattern"],
		additionalProperties: false,
	},
	// A tool behind `ToolSearch` needs one more call before it works (task 19.15).
	isDeferred: false,
});

/** The tool that each built-in search tool has in its place, by the name of the built-in. */
export const SEARCH_TOOLS: Readonly<Record<string, ToolSpec>> = {
	Grep: toolSpec("grep", TOOL_GREP, GREP_FIELDS),
	Glob: toolSpec("glob", TOOL_GLOB, GLOB_FIELDS),
};
