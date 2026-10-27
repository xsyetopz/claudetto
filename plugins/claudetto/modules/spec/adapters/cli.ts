// The CLI `minispec` of the `spec` slice, in the layout of OpenSpec 1.15.0. The launcher `bin/minispec` calls `main`.
// A schema in `openspec/schemas/<name>/` wins over the preset in `presets/<name>/`, and a template that it lacks comes from `presets/templates/`.
// Each command gives its JSON object and its text lines, and `main` prints one of them.

import path from "node:path";
import { CHANGES_DIR } from "../../project/domain/paths.ts";
import { archive, sync } from "./archive.ts";
import { changeStatus, instructions, newChange } from "./change.ts";
import { validate } from "./check.ts";
import { type Ctx, Fail, type Out, projectRoot } from "./ctx.ts";
import { list, show } from "./list.ts";
import { schemas, schemaValidate } from "./schemas.ts";

/** Each command: its usage line, its code, and the word that must follow it (`new change`, `schema validate`). */
const COMMANDS: Record<string, [string, (ctx: Ctx) => Promise<Out>, string?]> =
	{
		new: [
			"minispec new change <name> [--schema <preset>] [--description <text>] [--goal <text>] [--json]",
			newChange,
			"change",
		],
		list: [
			"minispec list [--specs | --archived | --all] [--sort recent|name] [--json]",
			list,
		],
		status: ["minispec status --change <name> | --all [--json]", changeStatus],
		instructions: [
			"minispec instructions apply|<artifact> --change <name> [--json]",
			instructions,
		],
		show: [
			"minispec show <change|spec> [--json] [--deltas-only] [--diff] [--requirements | --no-scenarios] [--requirement <n> | -r <n>]",
			show,
		],
		validate: [
			"minispec validate <name> | --all | --changes | --specs | --archived [--strict] [--json]",
			validate,
		],
		schemas: ["minispec schemas [--json]", schemas],
		schema: [
			"minispec schema validate [<name>] [--json]",
			schemaValidate,
			"validate",
		],
		sync: ["minispec sync <name>", sync],
		archive: [
			"minispec archive <name> [--yes | -y] [--skip-specs] [--no-validate] [--json]",
			archive,
		],
	};

/** The usage of `name`, or of each command. */
const usageOf = (name = ""): string =>
	`Usage:\n${(COMMANDS[name] ? [COMMANDS[name]] : Object.values(COMMANDS))
		.map(([u]) => `  ${u}`)
		.join("\n")}`;

const HELP = ["-h", "--help"];
const FLAG_WITH_VALUE = /^--?[\w-]+=/;

type Kind = "flag" | "value" | "word";

/** Each flag of `args` after the command, with `true` when the usage line says that it takes a value, `false` when not, and `undefined` when the usage line lacks it. A flag that takes a value skips its value. */
const knownOf = (usage: string) =>
	new Map(
		[...usage.matchAll(/(--?[\w-]+)( <|\s\w+\|)?/g)].map((m) => [
			m[1],
			Boolean(m[2]),
		]),
	);

/** Each argument of `args` after the command with its kind: a `flag`, the `value` of a flag that takes one, or a `word`. `--flag=value` and `-r=value` split into the flag and its value. Each reader of arguments shares this one walk, so all agree on which argument is a value. */
const walk = (usage: string, args: string[]): [string, Kind][] => {
	const known = knownOf(usage);
	const out: [string, Kind][] = [];
	let value = false;
	for (const arg of args.slice(1)) {
		const eq = FLAG_WITH_VALUE.test(arg) ? arg.indexOf("=") : -1;
		if (value) {
			out.push([arg, "value"]);
		} else if (!arg.startsWith("-")) {
			out.push([arg, "word"]);
		} else if (eq < 0) {
			out.push([arg, "flag"]);
		} else {
			out.push([arg.slice(0, eq), "flag"], [arg.slice(eq + 1), "value"]);
		}
		value = !value && eq < 0 && arg.startsWith("-") && Boolean(known.get(arg));
	}
	return out;
};

/** The value of each flag that takes one, by its first use. */
const valuesOf = (walked: [string, Kind][]) => {
	const values = new Map<string, string | undefined>();
	for (const [i, [arg, kind]] of walked.entries()) {
		const next = walked[i + 1];
		if (kind === "flag" && !values.has(arg)) {
			values.set(arg, next?.[1] === "value" ? next[0] : undefined);
		}
	}
	return values;
};

/** The first of `flags` that the usage line lacks. `--no-interactive` is accepted, and OpenSpec scripts pass it. */
const unknownFlag = (usage: string, flags: Set<string>): string | undefined =>
	[...flags].find(
		(arg) => !knownOf(usage).has(arg) && arg !== "--no-interactive",
	);

/** The version of the plugin that holds this CLI. */
const version = async (): Promise<string> => {
	const manifest: unknown = await globalThis.Bun.file(
		path.resolve(import.meta.dirname, "../../../.claude-plugin/plugin.json"),
	).json();
	return typeof manifest === "object" &&
		manifest !== null &&
		"version" in manifest &&
		typeof manifest.version === "string"
		? manifest.version
		: "unknown";
};

/** The exit status of a call that needs no command (`--version`, `help`, `-h`, `--help`), or `undefined`. */
const early = async (args: string[], flags: Set<string>, io: Ctx["io"]) => {
	const first = args[0] ?? "";
	if (first === "--version") {
		io.log(await version());
	} else if (
		first === "help" ||
		HELP.some((h) => flags.has(h)) ||
		HELP.includes(first)
	) {
		io.log(usageOf(first === "help" ? args[1] : first));
	} else {
		return;
	}
	return 0;
};

/** The code of the command in `args`, or a usage failure for an unknown command, a missing word, or an unknown flag. */
const commandOf = (args: string[], flags: Set<string>) => {
	const first = args[0] ?? "";
	const [usage = "", run, sub] = COMMANDS[first] ?? [];
	if (!run || (sub && args[1] !== sub)) {
		throw new Fail(usageOf(first), 2);
	}
	const bad = unknownFlag(usage, flags);
	if (bad) {
		throw new Fail(
			`The command '${first}' has no flag '${bad}'. ${usageOf(first)}`,
			2,
		);
	}
	return run;
};

/** Runs `minispec` with `args` in the project of `cwd`, and gives the exit status. */
export const main = async (
	argv: string[],
	cwd: string = process.cwd(),
	io: Ctx["io"] = console,
): Promise<number> => {
	// `--flag=value` reads as `--flag value`, as in OpenSpec. The value of a flag that takes one stays whole.
	const walked = walk(COMMANDS[argv[0] ?? ""]?.[0] ?? "", argv);
	const words = walked.filter(([, k]) => k === "word").map(([a]) => a);
	const values = valuesOf(walked);
	const root = await projectRoot(cwd);
	const ctx: Ctx = {
		root,
		changes: path.join(root, CHANGES_DIR),
		configFile: path.join(root, "openspec/config.yaml"),
		words,
		values,
		flags: new Set(walked.filter(([, k]) => k === "flag").map(([a]) => a)),
		io,
	};
	try {
		const status = await early(argv, ctx.flags, io);
		if (status !== undefined) {
			return status;
		}
		const [data, lines, code = 0] = await commandOf(argv, ctx.flags)(ctx);
		if (data !== undefined && ctx.flags.has("--json")) {
			io.log(JSON.stringify(data, null, 2));
		} else {
			for (const line of lines) {
				io.log(line);
			}
		}
		return code;
	} catch (e) {
		if (!(e instanceof Fail)) {
			throw e;
		}
		io.error(e.message);
		return e.status;
	}
};
