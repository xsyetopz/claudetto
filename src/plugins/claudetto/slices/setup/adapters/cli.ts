// The CLI `claudetto-setup` of the `setup` slice. The launcher `bin/claudetto-setup` calls `main`.
//
//   claudetto-setup [--scope user|project|local] [--advisor builtin|claudetto] [--apply]
//   claudetto-setup --addons
//
// With `--addons`, it prints the optional step of each add-on that `enabledPlugins` lists as enabled, and writes nothing.
//
// It cleans the keys of 0.1.0 out of the settings file and out of `CLAUDE.md`, then merges the settings snippet into the settings file.
// It writes nothing without `--apply`.
// In a project that uses Docker, on macOS only, it also offers the Docker socket in `sandbox.network.allowUnixSockets` of the local settings, and writes it with `--apply`.
// Claude Code ignores `allowUnixSockets` on Linux, so setup skips the step there.
// With `--apply`, in a project with `.git/`, it also appends the local files of claudetto to `.gitignore`.
// With `--advisor claudetto`, the snippet also sets `CLAUDE_CODE_DISABLE_ADVISOR_TOOL=1`, so that Claude sees one advisor only.
// With no `--advisor`, the CLI reads the `advisor` option from `pluginConfigs` in the user settings, because a CLI run by the user gets no `CLAUDE_PLUGIN_OPTION_*` env var.
// The skill passes no `--advisor`, so that the model cannot choose the value.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { writeAtomic } from "../../../../../kernel/node/fs.ts";
import {
  CLAUDE_DIR,
  PROJECT_LOCAL_SETTINGS,
  PROJECT_SETTINGS,
  SETTINGS_FILE,
} from "../../../../../kernel/paths.ts";
import { pluginOption } from "../../../../../kernel/plugin-option.ts";
import { addonSteps } from "../domain/addons.ts";
import {
  cleanAutoMode,
  cleanGitConfig,
  cleanLegacyKeys,
  stripBlock,
} from "../domain/cleanup.ts";
import { dockerSocket, usesDocker } from "../domain/docker.ts";
import { withIgnores } from "../domain/gitignore.ts";
import { isObject, type Json, merge, snippetFor } from "../domain/merge.ts";
import {
  CLAUDE_MD_REMOVED,
  CLEANED,
  DRY_RUN,
  KEPT_KEY,
  PROJECT_NO_STATUS_LINE,
  REMOVED_RULE,
  SCOPE_MISSING,
  SETTINGS_FAILED,
  SETTINGS_MATCH,
  UNKNOWN_SCOPE,
  USAGE,
  WROTE,
} from "../prompts.ts";

/** The env var that turns off the built-in advisor, for the option `advisor` = `claudetto`. */
const ADVISOR_ENV = { CLAUDE_CODE_DISABLE_ADVISOR_TOOL: "1" };

/** Where the CLI prints. */
export type Io = { log: (line: string) => void; error: (line: string) => void };

const consoleIo: Io = { log: console.log, error: console.error };

/** The plugin folder, three levels above this file. */
const ROOT = path.resolve(import.meta.dirname, "..", "..", "..");

/** Prints `message` as an error and gives the exit status of a bad call. */
const fail = (io: Io, message: string): number => {
  io.error(message);
  return 2;
};

/** The parsed JSON of `file`, `{}` when the file is missing. Throws on text that is not a JSON object. */
const readSettings = async (file: string): Promise<Json> => {
  if (!fs.existsSync(file)) return {};
  const data: unknown = JSON.parse(await Bun.file(file).text());
  if (!isObject(data)) throw new Error("The settings are not an object.");
  return data;
};

/** The settings of `file`, or `undefined` after an error line when the file does not parse. */
const readReported = async (
  file: string,
  io: Io,
): Promise<Json | undefined> => {
  const settings = await readSettings(file).catch((err: Error) => err);
  if (!(settings instanceof Error)) return settings;
  io.error(SETTINGS_FAILED({ file, message: settings.message }));
  return undefined;
};

/**
 * The `advisor` option of the user: `claudetto` or `builtin`.
 * It comes from the env var `CLAUDE_PLUGIN_OPTION_ADVISOR`, then from `pluginConfigs` of the user settings, and it is `builtin` when the option is not set or the file does not parse.
 */
const advisorOption = async (
  configDir: string,
  env: Record<string, string | undefined>,
): Promise<string> => {
  const settings = await readSettings(
    path.join(configDir, SETTINGS_FILE),
  ).catch(() => ({}) as Json);
  return pluginOption("claudetto", "advisor", env, settings) === "claudetto"
    ? "claudetto"
    : "builtin";
};

/** Appends the local files of claudetto to the `.gitignore` of the project, when the project has `.git/`. */
const ignoreLocal = async (projectDir: string): Promise<void> => {
  if (!fs.existsSync(path.join(projectDir, ".git"))) return;
  const file = path.join(projectDir, ".gitignore");
  const text = fs.existsSync(file) ? await Bun.file(file).text() : "";
  const next = withIgnores(text);
  if (next !== text) await writeAtomic(file, next);
};

/**
 * In a project that uses Docker, adds the Docker socket to `sandbox.network.allowUnixSockets` of the local settings,
 * because the socket path belongs to the machine of the user.
 * It prints the offer and writes only with `apply`.
 * It does nothing off macOS, where Claude Code ignores `allowUnixSockets`.
 * It gives the exit status: 1 when the local settings do not parse.
 */
const allowDocker = async (
  projectDir: string,
  env: NodeJS.ProcessEnv,
  apply: boolean,
  io: Io,
  exists: (file: string) => boolean,
  platform: string,
  hintShown: boolean,
): Promise<number> => {
  if (platform !== "darwin") return 0;
  const inProject = (name: string) =>
    fs.existsSync(path.join(projectDir, name));
  const texts: Record<string, string> = {};
  for (const name of ["justfile", "Justfile", "package.json"])
    if (inProject(name))
      texts[name] = await Bun.file(path.join(projectDir, name)).text();
  const read = (name: string) => texts[name] ?? "";
  if (!usesDocker(inProject, read, () => fs.readdirSync(projectDir))) return 0;
  const socket = dockerSocket(env, env["HOME"] || os.homedir(), exists);
  if (!socket) return 0;
  const file = path.join(projectDir, PROJECT_LOCAL_SETTINGS);
  const current = await readReported(file, io);
  if (!current) return 1;
  const changes: string[] = [];
  const next = merge(
    current,
    { sandbox: { network: { allowUnixSockets: [socket] } } },
    changes,
  );
  if (!changes.length) return 0;
  io.log(
    `Docker project: ${file} gets sandbox.network.allowUnixSockets ${socket}`,
  );
  if (!apply) {
    if (!hintShown) io.log(`\n${DRY_RUN}`);
    return 0;
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  await writeAtomic(file, `${JSON.stringify(next, null, 2)}\n`);
  return 0;
};

/** Run the CLI with `args` and return the exit status. */
export const main = async (
  args: string[],
  env: NodeJS.ProcessEnv = process.env,
  cwd: string = process.cwd(),
  io: Io = consoleIo,
  exists: (file: string) => boolean = fs.existsSync,
  platform: string = process.platform,
): Promise<number> => {
  let hintShown = false;
  const seen: Io = {
    ...io,
    log: (line) => {
      if (line.includes(DRY_RUN)) hintShown = true;
      io.log(line);
    },
  };
  const status = await setup(args, env, cwd, seen);
  const project = path.resolve(env["CLAUDE_PROJECT_DIR"] || cwd);
  // After the settings write, so that scope `local` does not overwrite the entry.
  if (status !== 0 || args.includes("--addons")) return status;
  const apply = args.includes("--apply");
  return allowDocker(project, env, apply, io, exists, platform, hintShown);
};

const setup = async (
  args: string[],
  env: NodeJS.ProcessEnv = process.env,
  cwd: string = process.cwd(),
  io: Io = consoleIo,
): Promise<number> => {
  const addons = args.includes("--addons");
  if (addons && args.length > 1) return fail(io, USAGE);
  const apply = args.includes("--apply");
  const at = args.indexOf("--scope");
  const scope = at < 0 ? "user" : args[at + 1];
  const adv = args.indexOf("--advisor");
  const flag = adv < 0 ? undefined : args[adv + 1];
  const bad = args.filter(
    (a, i) =>
      !["--apply", "--addons", "--scope", "--advisor"].includes(a) &&
      !(i > 0 && [at, adv].includes(i - 1)),
  );
  if (
    bad.length > 0 ||
    (adv >= 0 && flag !== "builtin" && flag !== "claudetto")
  )
    return fail(io, USAGE);
  if (!scope || scope.startsWith("--")) return fail(io, SCOPE_MISSING);
  const configDir =
    env["CLAUDE_CONFIG_DIR"] || path.join(os.homedir(), CLAUDE_DIR);
  const advisor = flag ?? (await advisorOption(configDir, env));
  const projectDir = path.resolve(env["CLAUDE_PROJECT_DIR"] || cwd);
  const files: Record<string, [string, string]> = {
    user: [
      path.join(configDir, SETTINGS_FILE),
      path.join(configDir, "CLAUDE.md"),
    ],
    project: [
      path.join(projectDir, PROJECT_SETTINGS),
      path.join(projectDir, "CLAUDE.md"),
    ],
    local: [
      path.join(projectDir, PROJECT_LOCAL_SETTINGS),
      path.join(projectDir, "CLAUDE.local.md"),
    ],
  };
  const [file, claudeMd] = Object.hasOwn(files, scope)
    ? (files[scope] as [string, string])
    : [];
  if (!file || !claudeMd) return fail(io, UNKNOWN_SCOPE({ scope }));
  if (addons) {
    const parsed = await Promise.all(
      Object.values(files).map(([f]) => readSettings(f)),
    ).catch((err: Error) => err);
    if (parsed instanceof Error) {
      io.error(SETTINGS_FAILED({ file: "settings", message: parsed.message }));
      return 1;
    }
    for (const step of addonSteps(parsed)) io.log(step);
    return 0;
  }
  const current = await readReported(file, io);
  if (!current) return 1;
  const cleaned = cleanLegacyKeys(cleanAutoMode(cleanGitConfig(current)));
  const { snippet, kept } = snippetFor(cleaned, ROOT, scope === "project");
  if (advisor === "claudetto")
    snippet["env"] = { ...(snippet["env"] as Json), ...ADVISOR_ENV };
  const changes = Object.keys(current)
    .filter((k) => JSON.stringify(cleaned[k]) !== JSON.stringify(current[k]))
    .map((key) => CLEANED({ key }));
  const askOf = (s: Json): unknown[] =>
    isObject(s["permissions"]) && Array.isArray(s["permissions"]["ask"])
      ? s["permissions"]["ask"]
      : [];
  const keptAsk = askOf(cleaned);
  for (const rule of askOf(current))
    if (!keptAsk.includes(rule))
      changes.push(REMOVED_RULE({ rule: String(rule) }));
  const settings = merge(cleaned, snippet, changes);
  const mdText = fs.existsSync(claudeMd) ? await Bun.file(claudeMd).text() : "";
  const mdNext = stripBlock(mdText);
  if (mdNext !== mdText) changes.push(CLAUDE_MD_REMOVED({ file: claudeMd }));
  io.log(`Target: ${file} (${scope} scope)`);
  if (scope === "project") io.log(PROJECT_NO_STATUS_LINE);
  for (const key of kept) io.log(KEPT_KEY({ key }));
  io.log(changes.length ? `${changes.length} change(s):` : SETTINGS_MATCH);
  for (const line of changes) io.log(`  ${line}`);
  if (apply) await ignoreLocal(projectDir);
  if (!changes.length) return 0;
  if (!apply) {
    io.log(`\n${DRY_RUN}`);
    return 0;
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  await writeAtomic(file, `${JSON.stringify(settings, null, 2)}\n`);
  if (mdNext !== mdText) await writeAtomic(claudeMd, mdNext);
  io.log(`\n${WROTE({ file })}`);
  return 0;
};
