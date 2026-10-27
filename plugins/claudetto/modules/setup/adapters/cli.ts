// The CLI `claudetto-setup`, which the launcher `bin/claudetto-setup` calls. Usage: see `usage` in `prompts.ts`.
// It writes nothing without `--apply`. `--claude-md-rule=LINE` takes the `=` form, because a line can start with `-`.
import os from "node:os";
import path from "node:path";
import { fileReader } from "../../../kernel/node/fs.ts";
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
import { type Options, offSettings, parseOptions } from "./options.ts";
import { fail, type Io, ROOT, report, save } from "./report.ts";
import {
	amend,
	exists,
	pluginInfo,
	readOr,
	readSettings,
	rulesIn,
	skillsIn,
} from "./scan.ts";

/** The `env` of the snippet with the subagent cap `cap`. */
const withCap = (env: unknown, cap: number): Json => ({
	...(isObject(env) ? env : {}),
	CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS: String(cap),
});

interface Dirs {
	configDir: string;
	projectDir: string;
}

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
