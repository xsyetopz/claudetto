import { baseName, stripWrappers, words } from "./wrappers.ts";

export interface GitCall {
	dir: string | undefined;
	verb: string;
	args: string[];
}

/** The `-c` keys that never run a program; a `pager.*` key is one only with the value `false`. */
const SAFE_KEY =
	/^(?:color\..+|core\.quotepath|user\.(?:name|email)|advice\..+|init\.defaultbranch|log\..+|format\.pretty|diff\.noprefix)$/;

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

export const isGitEnv = (name: string): boolean =>
	name.startsWith("GIT_CONFIG_") || PROGRAM_VARS.has(name);

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

const keepsConfig = (opt: string, next: string | undefined): boolean => {
	if (opt === "-c") {
		return ALIAS_KEY.test(next ?? "");
	}
	if (opt.startsWith("-c")) {
		return GLUED_ALIAS_OPT.test(opt);
	}
	return !opt.startsWith("-C") && !PATH_CHANGING_OPT.test(opt);
};

export type Aliases = ReadonlyMap<string, string>;

const ENV_ALIAS = "!$CLAUDETTO_ALIAS_ENV";

const VALUE_OPTS = new Set(
	"-C -c --git-dir --work-tree --namespace --exec-path --super-prefix --config-env".split(
		" ",
	),
);

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

const optionAlias = (
	opt: string,
	next: string | undefined,
): [string, string] | undefined => {
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
