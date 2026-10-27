// The CLI `claudetto-setup`, which the launcher `bin/claudetto-setup` calls. Usage: see `usage` in `prompts.ts`.
// It writes nothing without `--apply`. `--claude-md-rule=LINE` takes the `=` form, because a line can start with `-`.
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { parseArgs } from "node:util";
import { fileReader, writeAtomic } from "../../../kernel/node/fs.ts";
import { withIgnores, withLines } from "../../project/domain/gitignore.ts";
import {
	CLAUDE_DIR,
	CLAUDE_STATE_FILE,
	PROJECT_LOCAL_SETTINGS,
	PROJECT_SETTINGS,
	SETTINGS_FILE,
} from "../../project/domain/paths.ts";
import { inventory } from "../domain/inventory.ts";
import {
	dropOldDeny,
	isObject,
	type Json,
	merge,
	snippetFor,
} from "../domain/merge.ts";
import { planCap, planOption } from "../domain/plan.ts";
import { sandboxSnippet } from "../domain/sandbox.ts";
import { t } from "../prompts.ts";
import {
	findMemoryFiles,
	writeClaudeMd,
	writeLocalNotes,
} from "./claude-md.ts";
import { findOpenspec, openspecRun } from "./openspec.ts";
import {
	amend,
	context7Files,
	exists,
	pluginInfo,
	readOr,
	readSettings,
	rulesIn,
	skillDescription,
	skillsIn,
} from "./scan.ts";

interface Io {
	log: (line: string) => void;
	error: (line: string) => void;
}
interface Dirs {
	configDir: string;
	projectDir: string;
}

const ROOT = path.resolve(import.meta.dirname, "..", "..", "..");
const NO_VALUES: string[] = [];
const multi = {
	type: "string",
	multiple: true,
	default: NO_VALUES,
} as const;
const flag = { type: "boolean", default: false } as const;

/** The `env` of the snippet with the subagent cap `cap`. */
const withCap = (env: unknown, cap: number): Json => ({
	...(isObject(env) ? env : {}),
	CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS: String(cap),
});

/** Prints `message` as an error and gives the exit status of a bad call. */
const fail = (io: Io, message: string): number => {
	io.error(message);
	return 2;
};

/** The options of the arguments, or the usage to print when they are wrong. */
const parseOptions = (args: string[]) => {
	try {
		const { values } = parseArgs({
			args,
			options: {
				scope: { type: "string", default: "user" },
				mode: { type: "string", default: "merge" },
				keep: multi,
				"off-tool": multi,
				"off-skill": multi,
				"off-plugin": multi,
				"deny-mcp": multi,
				"exclude-md": multi,
				"claude-md-rule": multi,
				apply: flag,
				inventory: flag,
				"demo-alias": flag,
				"remove-openspec": flag,
				"claude-md": flag,
				"local-notes": flag,
			},
		});
		// The three write actions take `--apply` as their yes, so `--apply` clashes with the other actions only.
		const writes = [
			values["remove-openspec"],
			values["claude-md"],
			values["local-notes"],
		];
		const others = [values.inventory, values["demo-alias"]].filter(Boolean);
		const count = writes.filter(Boolean).length;
		const clash = count
			? count + others.length > 1
			: others.length + Number(values.apply) > 1;
		return clash || !["merge", "replace"].includes(values.mode)
			? { error: t("usage") }
			: values;
	} catch {
		return { error: t("usage") };
	}
};

type Options = Exclude<ReturnType<typeof parseOptions>, { error: string }>;

/** The settings that turn off the names in `o`, with no key for an empty list. An off plugin or MCP server is for one project. */
const offSettings = (o: Options): Json => {
	const each = (names: string[], value: unknown) =>
		Object.fromEntries(names.map((n) => [n, value]));
	const [tools, skills, plugins, servers] = [
		o["off-tool"],
		o["off-skill"],
		o["off-plugin"],
		o["deny-mcp"],
	];
	const keys: [string, string[], unknown][] = [
		["permissions", tools, { deny: tools }],
		["claudeMdExcludes", o["exclude-md"], o["exclude-md"]],
		["skillOverrides", skills, each(skills, "off")],
		["enabledPlugins", plugins, each(plugins, false)],
		[
			"deniedMcpServers",
			servers,
			servers.map((serverName) => ({ serverName })),
		],
	];
	return Object.fromEntries(
		keys
			.filter(([, names]) => names.length)
			.map(([key, , value]) => [key, value]),
	);
};

interface Run {
	file: string;
	settings: Json;
	changes: string[];
	apply: boolean;
	backup: boolean;
}

/** Writes `settings` to `file` with `apply` and a change, after a copy of the old file with `backup`, or prints the dry-run line. */
const save = async (
	io: Io,
	{ file, settings, changes, apply, backup }: Run,
): Promise<number> => {
	if (changes.length === 0) {
		return 0;
	}
	if (apply) {
		await fs.mkdir(path.dirname(file), { recursive: true });
		if (backup && (await exists(file))) {
			const copy = `${file}.${Date.now()}.bak`;
			await fs.copyFile(file, copy);
			io.log(t("backup", { file: copy }));
		}
		await writeAtomic(file, `${JSON.stringify(settings, null, 2)}\n`);
		io.log(`\n${t("wrote", { file })}`);
	} else {
		io.log(`\n${t("dryRun")}`);
	}
	return 0;
};

/** The file by the key `name` of `files`, or `undefined` for a key that `files` does not hold itself. */
const pick = (files: Record<string, string>, name: string) =>
	Object.hasOwn(files, name) ? files[name] : undefined;

/** Appends the alias once to the startup file of the `zsh` or `bash` shell of the user. */
const writeDemoAlias = async (
	env: NodeJS.ProcessEnv,
	io: Io,
): Promise<number> => {
	const shell = path.basename(env["SHELL"] ?? "");
	const home = env["HOME"] || os.homedir();
	const file = pick(
		{
			zsh: path.join(env["ZDOTDIR"] || home, ".zshrc"),
			bash: path.join(home, ".bashrc"),
		},
		shell,
	);
	if (!file) {
		return fail(io, t("demoNoRc", { shell: shell || "(unset)" }));
	}
	await amend(file, (text) =>
		withLines(text, t("demoHeader"), [t("demoAlias")]),
	);
	io.log(t("demoWrote", { file }));
	return 0;
};

interface Info {
	file: string;
	scope: string;
	cap: unknown;
	tier: string;
	kept: string[];
	dirs: string[];
	changes: string[];
}

/** Prints the target, the notes, the `context7` files, and the changes. */
const report = async (
	io: Io,
	{ file, scope, cap, tier, kept, dirs, changes }: Info,
) => {
	io.log(`Target: ${file} (${scope} scope)`);
	if (scope === "project") {
		io.log(t("projectNoStatus"));
	}
	if (scope === "project") {
		io.log(t("projectNoCap"));
	} else if (!cap) {
		io.log(t("noPlanCap", { tier }));
	}
	for (const key of kept) {
		io.log(t("keptKey", { key }));
	}
	const own = path.join(ROOT, "skills", "find-docs", "SKILL.md");
	const ownChars = skillDescription(
		await globalThis.Bun.file(own).text(),
	).length;
	for (const dir of new Set(dirs)) {
		for (const [found, chars] of await context7Files(dir)) {
			io.log(t("context7", { file: found, chars, ownChars }));
		}
	}
	io.log(
		changes.length > 0 ? `${changes.length} change(s):` : t("settingsMatch"),
	);
	for (const line of changes) {
		io.log(`  ${line}`);
	}
};

type Have = Pick<
	Parameters<typeof inventory>[0],
	"current" | "snippet" | "state" | "plan"
>;

/** The inventory, with the files that `have` leaves out read from the config and project folders. */
const inventoryOf = async (
	env: NodeJS.ProcessEnv,
	have: Have,
	{ configDir, projectDir }: Dirs,
) =>
	inventory({
		...have,
		projectDir,
		mcpJson: await readOr(path.join(projectDir, ".mcp.json")),
		skills: [
			...(await skillsIn(configDir, "user")),
			...(await skillsIn(path.join(projectDir, CLAUDE_DIR), "project")),
		],
		pluginInfo: await pluginInfo(configDir, have.current["enabledPlugins"]),
		openspec: await findOpenspec(env, configDir, projectDir),
		rules: await rulesIn(configDir),
		memoryFiles: await findMemoryFiles(
			projectDir,
			configDir,
			have.current["claudeMdExcludes"],
		),
	});

/** The action that changes no settings file, or `null` when `o` names none. */
const sideAction = async (
	io: Io,
	env: NodeJS.ProcessEnv,
	o: Options,
	{ configDir, projectDir }: Dirs,
): Promise<number | null> => {
	if (o["demo-alias"]) {
		return writeDemoAlias(env, io);
	}
	if (o["remove-openspec"]) {
		return openspecRun(io, env, o.apply, configDir, projectDir);
	}
	if (o["claude-md"]) {
		return writeClaudeMd(io, configDir, o["claude-md-rule"], o.apply);
	}
	if (o["local-notes"]) {
		return writeLocalNotes(io, projectDir, o.apply);
	}
	return null;
};

/** Merges only the off entries of `o` into `current` and saves them, or `null` when `o` has none. */
const turnOff = async (
	io: Io,
	o: Options,
	file: string,
	current: Json,
): Promise<number | null> => {
	const off = offSettings(o);
	if (Object.keys(off).length === 0) {
		return null;
	}
	if (
		(off["enabledPlugins"] ?? off["deniedMcpServers"]) &&
		o.scope !== "project"
	) {
		return fail(io, t("denyMcpScope"));
	}
	const changes: string[] = [];
	const settings = merge(current, off, changes);
	for (const line of changes) {
		io.log(`  ${line}`);
	}
	return save(io, { file, settings, changes, apply: o.apply, backup: false });
};

/** Run the CLI with `args` and return the exit status. */
export const main = async (
	args: string[],
	env: NodeJS.ProcessEnv = process.env,
	cwd: string = process.cwd(),
	io: Io = {
		log: (line) => process.stdout.write(`${line}\n`),
		error: console.error,
	},
): Promise<number> => {
	const options = parseOptions(args);
	if ("error" in options) {
		return fail(io, options.error);
	}
	const { apply, scope, mode, keep } = options;
	const configDir =
		env["CLAUDE_CONFIG_DIR"] || path.join(os.homedir(), CLAUDE_DIR);
	const dirs = {
		configDir,
		projectDir: path.resolve(env["CLAUDE_PROJECT_DIR"] || cwd),
	};
	const side = await sideAction(io, env, options, dirs);
	if (side !== null) {
		return side;
	}
	const file = pick(
		{
			user: path.join(configDir, SETTINGS_FILE),
			project: path.join(dirs.projectDir, PROJECT_SETTINGS),
			local: path.join(dirs.projectDir, PROJECT_LOCAL_SETTINGS),
		},
		scope,
	);
	if (!file) {
		return fail(io, t("unknownScope", { scope }));
	}
	const current = await readSettings(file).catch((err: Error) => err);
	if (current instanceof Error) {
		io.error(t("settingsFailed", { file, message: current.message }));
		return 1;
	}
	const off = await turnOff(io, options, file, current);
	if (off !== null) {
		return off;
	}
	const changes: string[] = [];
	const upgraded = dropOldDeny(mode === "replace" ? {} : current, changes);
	const { snippet, kept } = snippetFor(upgraded, ROOT, scope === "project");
	const state = await readOr(
		path.join(env["CLAUDE_CONFIG_DIR"] || os.homedir(), CLAUDE_STATE_FILE),
	);
	const { cap, tier } = planCap(state);
	if (cap && scope !== "project") {
		snippet["env"] = withCap(snippet["env"], cap);
		snippet["pluginConfigs"] = planOption(current, tier);
	}
	snippet["sandbox"] = await sandboxSnippet(fileReader.list);
	if (options.inventory) {
		const have = { current, snippet, state, plan: { tier, cap } };
		io.log(JSON.stringify(await inventoryOf(env, have, dirs), null, 2));
		return 0;
	}
	const settings = merge(upgraded, snippet, changes, keep);
	const searched = [configDir, path.join(dirs.projectDir, CLAUDE_DIR)];
	await report(io, { file, scope, cap, tier, kept, dirs: searched, changes });
	if (apply && (await exists(path.join(dirs.projectDir, ".git")))) {
		await amend(path.join(dirs.projectDir, ".gitignore"), withIgnores);
	}
	return save(io, {
		file,
		settings,
		changes,
		apply,
		backup: mode === "replace",
	});
};
