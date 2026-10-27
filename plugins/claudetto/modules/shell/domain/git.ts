// The head of a `git` command, for `shell.ts` and the `git` rules of the gate: the folder, the verb, and the aliases of `-c alias.X=...`.
// The aliases of the env (`GIT_CONFIG_*`) are here too.
// `runs` is true when an option sets a config key that can make `git` run a program.
// `plain` is true for a call with no wrapper, no env prefix, and no option that changes the config files.

import { baseName, stripWrappers, words } from "./wrappers.ts";

export interface GitCall {
	dir: string | undefined;
	verb: string;
	args: string[];
}

/** The `-c` keys that never run a program. A `pager.*` key is one only with the value `false`. */
const SAFE_KEY =
	/^(?:color\..+|core\.quotepath|user\.(?:name|email)|advice\..+|init\.defaultbranch|log\..+|format\.pretty|diff\.noprefix)$/;

/** The variables that name a program for `git` to run, with the values that run no code. */
const PROGRAM_VARS = new Set(
	"GIT_PAGER GIT_EDITOR GIT_SSH GIT_SSH_COMMAND GIT_EXTERNAL_DIFF GIT_ASKPASS GIT_SEQUENCE_EDITOR GIT_PROXY_COMMAND SSH_ASKPASS EDITOR VISUAL PAGER".split(
		" ",
	),
);
const CONFIG_KEY_VAR = /^GIT_CONFIG_KEY_(\d+)$/;
const SHORT_CONFIG_OPT = /^-c./s;
const CONFIG_ENV_OPT = /^--config-env(?:=(.*))?$/s;
const VALUE_SUFFIX = /=.*$/s;
const ALIAS_KEY = /^alias\./i;
const GLUED_ALIAS_OPT = /^-calias\./i;
const PATH_CHANGING_OPT =
	/^--(?:git-dir|work-tree|exec-path|config-env|bare)(?:=|$)/;
const ALIAS_VALUE = /^alias\.([^=]+)(?:=(.*))?$/s;
const GLUED_CONFIG_OPT = /^-c(.+)$/s;
const SAFE_PROGRAMS = new Set(["true", "false", ":", "cat"]);

/** True for a variable that `git` reads for a program or for its config: the gate reads its value. */
export const isGitEnv = (name: string): boolean =>
	name.startsWith("GIT_CONFIG_") || PROGRAM_VARS.has(name);

/** True when the config entry `entry` (`key=value`, or a bare `key`) can make `git` run a program: any key but an alias, a key of `SAFE_KEY`, and a `pager.*` set to `false`. An alias runs by its body, which the gate reads. */
const configRuns = (entry: string): boolean => {
	const at = entry.indexOf("=");
	const key = (at < 0 ? entry : entry.slice(0, at)).toLowerCase();
	if (key.startsWith("alias.") || SAFE_KEY.test(key)) {
		return false;
	}
	return !(
		key.startsWith("pager.") &&
		at >= 0 &&
		entry.slice(at + 1) === "false"
	);
};

/** True when the env `env` (see `isGitEnv`) makes `git` run a program: a variable of `PROGRAM_VARS` with a value that runs code, a `GIT_CONFIG_KEY_<n>`, or an entry of `GIT_CONFIG_PARAMETERS` for a key that runs one. */
export const envRuns = (env: ReadonlyMap<string, string>): boolean =>
	[...env].some(([name, value]) => {
		const n = CONFIG_KEY_VAR.exec(name)?.[1];
		if (n !== undefined) {
			return configRuns(`${value}=${env.get(`GIT_CONFIG_VALUE_${n}`) ?? ""}`);
		}
		if (name === "GIT_CONFIG_PARAMETERS") {
			return words(value).some(configRuns);
		}
		return PROGRAM_VARS.has(name) && !SAFE_PROGRAMS.has(value);
	});

/** The config entry that the option `opt` sets with `next` as its separate value: `-c key=value`, `-ckey=value`, or the key of `--config-env key=ENV` (its value is unread, so the entry has no `=`). */
const optionEntry = (
	opt: string,
	next: string | undefined,
): string | undefined => {
	if (opt === "-c") {
		return next;
	}
	if (SHORT_CONFIG_OPT.test(opt)) {
		return opt.slice(2);
	}
	const env = CONFIG_ENV_OPT.exec(opt);
	if (env === null) {
		return undefined;
	}
	return (env[1] ?? next ?? "").replace(VALUE_SUFFIX, "");
};

/** True when the option `opt` of `git`, with `next` as its separate value, leaves the config files that `git` reads as they are for the session folder: not `-C`, `--git-dir`, `--work-tree`, `--exec-path`, `--bare`, `--config-env`, or a `-c` for another key than `alias.X`. */
const keepsConfig = (opt: string, next: string | undefined): boolean => {
	if (opt === "-c") {
		return ALIAS_KEY.test(next ?? "");
	}
	if (opt.startsWith("-c")) {
		return GLUED_ALIAS_OPT.test(opt);
	}
	return !opt.startsWith("-C") && !PATH_CHANGING_OPT.test(opt);
};

/** The aliases of a `git` call: the name in lower case, as `git` reads it, and the body. */
export type Aliases = ReadonlyMap<string, string>;

/** The text that stands for the body of an alias that git reads from the env: it names a program that nothing assigned, so the gate asks. */
const ENV_ALIAS = "!$CLAUDETTO_ALIAS_ENV";

const VALUE_OPTS = new Set(
	"-C -c --git-dir --work-tree --namespace --exec-path --super-prefix --config-env".split(
		" ",
	),
);

/** The alias that the option `opt` with the value `value` sets: `-c alias.X=body` or `--config-env alias.X=ENV`. */
const aliasOf = (
	opt: string,
	value: string | undefined,
): [string, string] | undefined => {
	const m = ALIAS_VALUE.exec(value ?? "");
	if (m === null) {
		return undefined;
	}
	const name = (m[1] ?? "").toLowerCase();
	if (opt === "-c") {
		return [name, m[2] ?? ""];
	}
	return opt.startsWith("--config-env") ? [name, ENV_ALIAS] : undefined;
};

/** The alias that the option word `opt` sets, with `next` as its separate value: `-c alias.X=body`, `-calias.X=body`, `--config-env alias.X=ENV`, or `--config-env=alias.X=ENV`. */
const optionAlias = (
	opt: string,
	next: string | undefined,
): [string, string] | undefined => {
	// `-calias.X=body` is `-c alias.X=body`.
	const glued = GLUED_CONFIG_OPT.exec(opt)?.[1];
	if (glued !== undefined) {
		return aliasOf("-c", glued);
	}
	const at = opt.indexOf("=");
	return aliasOf(
		at < 0 ? opt : opt.slice(0, at),
		at < 0 ? next : opt.slice(at + 1),
	);
};

/** The `git` call of `argv` and its aliases, or `undefined` when `argv` is no `git` call or has no verb. */
export const gitHead = (
	argv: string[],
):
	| (GitCall & {
			aliases: Map<string, string>;
			plain: boolean;
			runs: boolean;
	  })
	| undefined => {
	const rest = stripWrappers(argv);
	if (baseName(rest[0] ?? "") !== "git") {
		return undefined;
	}
	const aliases = new Map<string, string>();
	let dir: string | undefined;
	// A wrapper or an env prefix of the call stands in front of `git`, so `rest` is shorter than `argv`.
	let plain = rest.length === argv.length;
	let runs = false;
	let i = 1;
	while ((rest[i] ?? "").startsWith("-")) {
		const opt = rest[i] ?? "";
		if (opt === "-C") {
			dir = rest[i + 1];
		}
		plain &&= keepsConfig(opt, rest[i + 1]);
		const entry = optionEntry(opt, rest[i + 1]);
		runs ||= entry !== undefined && configRuns(entry);
		const alias = optionAlias(opt, rest[i + 1]);
		if (alias) {
			aliases.set(...alias);
		}
		i += VALUE_OPTS.has(opt) ? 2 : 1;
	}
	const verb = rest[i];
	return verb === undefined
		? undefined
		: { dir, verb, args: rest.slice(i + 1), aliases, plain, runs };
};

const quote = (word: string): string => `'${word.replaceAll("'", "'\\''")}'`;

const ENV_ENTRY = /^alias\.([^=]+)=(.*)$/s;

/** The aliases that the env `env` gives `git`: `GIT_CONFIG_KEY_<n>` with `GIT_CONFIG_VALUE_<n>`, and the entries of `GIT_CONFIG_PARAMETERS`. */
export const envAliases = (env: ReadonlyMap<string, string>): Aliases => {
	const out = new Map<string, string>();
	for (const [name, key] of env) {
		const n = CONFIG_KEY_VAR.exec(name)?.[1];
		if (n !== undefined && key.startsWith("alias.")) {
			out.set(
				key.slice(6).toLowerCase(),
				env.get(`GIT_CONFIG_VALUE_${n}`) ?? "",
			);
		}
	}
	for (const entry of words(env.get("GIT_CONFIG_PARAMETERS") ?? "")) {
		const m = ENV_ENTRY.exec(entry);
		if (m) {
			out.set((m[1] ?? "").toLowerCase(), m[2] ?? "");
		}
	}
	return out;
};

/** The command text that the alias of the `git` call `call` runs (`!` body as a shell command, else a `git` call), or `undefined` when `aliases` has none for the verb. */
export const expandAlias = (
	call: GitCall,
	aliases: Aliases,
): string | undefined => {
	const body = aliases.get(call.verb.toLowerCase());
	if (body === undefined) {
		return undefined;
	}
	const args = call.args.map(quote);
	if (body.startsWith("!")) {
		return [body.slice(1), ...args].join(" ");
	}
	const dir = call.dir === undefined ? [] : ["-C", quote(call.dir)];
	return ["git", ...dir, body, ...args].join(" ");
};
