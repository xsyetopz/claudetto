// The CLI `claudetto-setup`, which the launcher `bin/claudetto-setup` calls. Usage: see `usage` in `prompts.ts`.
// It writes nothing without `--apply`. `--global-rule=LINE` takes the `=` form, because a line can start with `-`.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parseArgs } from "node:util";
import { writeAtomic } from "../../../kernel/node/fs.ts";
import {
  CLAUDE_DIR,
  CLAUDE_STATE_FILE,
  PROJECT_LOCAL_SETTINGS,
  PROJECT_SETTINGS,
  SETTINGS_FILE,
} from "../../../kernel/paths.ts";
import { withIgnores, withLines } from "../domain/gitignore.ts";
import { inventory } from "../domain/inventory.ts";
import { dropOldDeny, type Json, merge, snippetFor } from "../domain/merge.ts";
import { planCap, planOption } from "../domain/plan.ts";
import { t } from "../prompts.ts";
import {
  findMemoryFiles,
  writeGlobalMd,
  writeLocalNotes,
} from "./claude-md.ts";
import { findOpenspec, openspecRun } from "./openspec.ts";
import {
  amend,
  context7Files,
  pluginInfo,
  readOr,
  readSettings,
  rulesIn,
  skillsIn,
} from "./scan.ts";

type Io = { log: (line: string) => void; error: (line: string) => void };
type Dirs = { configDir: string; projectDir: string };

const ROOT = path.resolve(import.meta.dirname, "..", "..", "..");
const multi = {
  type: "string",
  multiple: true,
  default: [] as string[],
} as const;
const flag = { type: "boolean", default: false } as const;

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
        "global-rule": multi,
        apply: flag,
        inventory: flag,
        "demo-alias": flag,
        "remove-openspec": flag,
        "global-md": flag,
        "local-notes": flag,
      },
    });
    // The three write actions take `--apply` as their yes, so `--apply` clashes with the other actions only.
    const writes = [
      values["remove-openspec"],
      values["global-md"],
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

type Run = {
  file: string;
  settings: Json;
  changes: string[];
  apply: boolean;
  backup: boolean;
};

/** Writes `settings` to `file` with `apply` and a change, after a copy of the old file with `backup`, or prints the dry-run line. */
const save = async (
  io: Io,
  { file, settings, changes, apply, backup }: Run,
): Promise<number> => {
  if (!changes.length) return 0;
  if (!apply) io.log(`\n${t("dryRun")}`);
  else {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    if (backup && fs.existsSync(file)) {
      const copy = `${file}.${Date.now()}.bak`;
      fs.copyFileSync(file, copy);
      io.log(t("backup", { file: copy }));
    }
    await writeAtomic(file, `${JSON.stringify(settings, null, 2)}\n`);
    io.log(`\n${t("wrote", { file })}`);
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
  if (!file) return fail(io, t("demoNoRc", { shell: shell || "(unset)" }));
  await amend(file, (text) =>
    withLines(text, t("demoHeader"), [t("demoAlias")]),
  );
  io.log(t("demoWrote", { file }));
  return 0;
};

type Info = {
  file: string;
  scope: string;
  cap: unknown;
  tier: string;
  kept: string[];
  dirs: string[];
  changes: string[];
};

/** Prints the target, the notes, the `context7` files, and the changes. */
const report = async (
  io: Io,
  { file, scope, cap, tier, kept, dirs, changes }: Info,
) => {
  io.log(`Target: ${file} (${scope} scope)`);
  if (scope === "project") io.log(t("projectNoStatus"));
  if (scope === "project") io.log(t("projectNoCap"));
  else if (!cap) io.log(t("noPlanCap", { tier }));
  for (const key of kept) io.log(t("keptKey", { key }));
  for (const dir of new Set(dirs))
    for (const [found, chars] of await context7Files(dir))
      io.log(t("context7", { file: found, chars }));
  io.log(changes.length ? `${changes.length} change(s):` : t("settingsMatch"));
  for (const line of changes) io.log(`  ${line}`);
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

/** The action that changes no settings file, or `undefined` when `o` names none. */
const sideAction = (
  io: Io,
  env: NodeJS.ProcessEnv,
  o: Options,
  { configDir, projectDir }: Dirs,
) => {
  if (o["demo-alias"]) return writeDemoAlias(env, io);
  if (o["remove-openspec"])
    return openspecRun(io, env, o.apply, configDir, projectDir);
  if (o["global-md"])
    return writeGlobalMd(io, configDir, o["global-rule"], o.apply);
  if (o["local-notes"]) return writeLocalNotes(io, projectDir, o.apply);
  return undefined;
};

/** Merges only the off entries of `o` into `current` and saves them, or `undefined` when `o` has none. */
const turnOff = (io: Io, o: Options, file: string, current: Json) => {
  const off = offSettings(o);
  if (!Object.keys(off).length) return undefined;
  if (
    (off["enabledPlugins"] ?? off["deniedMcpServers"]) &&
    o.scope !== "project"
  )
    return fail(io, t("denyMcpScope"));
  const changes: string[] = [];
  const settings = merge(current, off, changes);
  for (const line of changes) io.log(`  ${line}`);
  return save(io, { file, settings, changes, apply: o.apply, backup: false });
};

/** Run the CLI with `args` and return the exit status. */
export const main = async (
  args: string[],
  env: NodeJS.ProcessEnv = process.env,
  cwd: string = process.cwd(),
  io: Io = { log: console.log, error: console.error },
): Promise<number> => {
  const options = parseOptions(args);
  if ("error" in options) return fail(io, options.error);
  const { apply, scope, mode, keep } = options;
  const configDir =
    env["CLAUDE_CONFIG_DIR"] || path.join(os.homedir(), CLAUDE_DIR);
  const dirs = {
    configDir,
    projectDir: path.resolve(env["CLAUDE_PROJECT_DIR"] || cwd),
  };
  const side = sideAction(io, env, options, dirs);
  if (side) return side;
  const file = pick(
    {
      user: path.join(configDir, SETTINGS_FILE),
      project: path.join(dirs.projectDir, PROJECT_SETTINGS),
      local: path.join(dirs.projectDir, PROJECT_LOCAL_SETTINGS),
    },
    scope,
  );
  if (!file) return fail(io, t("unknownScope", { scope }));
  const current = await readSettings(file).catch((err: Error) => err);
  if (current instanceof Error) {
    io.error(t("settingsFailed", { file, message: current.message }));
    return 1;
  }
  const off = turnOff(io, options, file, current);
  if (off) return off;
  const changes: string[] = [];
  const upgraded = dropOldDeny(mode === "replace" ? {} : current, changes);
  const { snippet, kept } = snippetFor(upgraded, ROOT, scope === "project");
  const state = await readOr(
    path.join(env["CLAUDE_CONFIG_DIR"] || os.homedir(), CLAUDE_STATE_FILE),
  );
  const { cap, tier } = planCap(state);
  if (cap && scope !== "project") {
    snippet["env"] = {
      ...(snippet["env"] as Json),
      CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS: String(cap),
    };
    snippet["pluginConfigs"] = planOption(current, tier);
  }
  if (options.inventory) {
    const have = { current, snippet, state, plan: { tier, cap } };
    io.log(JSON.stringify(await inventoryOf(env, have, dirs), null, 2));
    return 0;
  }
  const settings = merge(upgraded, snippet, changes, keep);
  const searched = [configDir, path.join(dirs.projectDir, CLAUDE_DIR)];
  await report(io, { file, scope, cap, tier, kept, dirs: searched, changes });
  if (apply && fs.existsSync(path.join(dirs.projectDir, ".git")))
    await amend(path.join(dirs.projectDir, ".gitignore"), withIgnores);
  return save(io, {
    file,
    settings,
    changes,
    apply,
    backup: mode === "replace",
  });
};
