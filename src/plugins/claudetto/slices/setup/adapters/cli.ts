// The CLI `claudetto-setup` of the `setup` slice. The launcher `bin/claudetto-setup` calls `main`.
//
//   claudetto-setup [--scope user|project|local] [--advisor builtin|claudetto] [--apply]
//
// It cleans the keys of 0.1.0 out of the settings file and out of `CLAUDE.md`, then merges the settings snippet into the settings file.
// It writes nothing without `--apply`.
// With `--advisor claudetto`, the snippet also sets `CLAUDE_CODE_DISABLE_ADVISOR_TOOL=1`, so that Claude sees one advisor only.
// The skill passes the `advisor` option, because a CLI run by the user gets no `CLAUDE_PLUGIN_OPTION_*` env var.

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
import {
  cleanAutoMode,
  cleanGitConfig,
  cleanLegacyKeys,
  stripBlock,
} from "../domain/cleanup.ts";
import { isObject, type Json, merge, snippetFor } from "../domain/merge.ts";
import {
  CLAUDE_MD_REMOVED,
  CLEANED,
  DRY_RUN,
  KEPT_KEY,
  PROJECT_NO_STATUS_LINE,
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

/** Run the CLI with `args` and return the exit status. */
export const main = async (
  args: string[],
  env: NodeJS.ProcessEnv = process.env,
  cwd: string = process.cwd(),
  io: Io = consoleIo,
): Promise<number> => {
  const apply = args.includes("--apply");
  const at = args.indexOf("--scope");
  const scope = at < 0 ? "user" : args[at + 1];
  const adv = args.indexOf("--advisor");
  const advisor = adv < 0 ? "builtin" : args[adv + 1];
  const bad = args.filter(
    (a, i) =>
      a !== "--apply" &&
      a !== "--scope" &&
      a !== "--advisor" &&
      i !== at + 1 &&
      i !== adv + 1,
  );
  if (bad.length > 0 || (advisor !== "builtin" && advisor !== "claudetto"))
    return fail(io, USAGE);
  if (!scope || scope.startsWith("--")) return fail(io, SCOPE_MISSING);
  const configDir =
    env["CLAUDE_CONFIG_DIR"] || path.join(os.homedir(), CLAUDE_DIR);
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
  let current: Json;
  try {
    current = await readSettings(file);
  } catch (err) {
    io.error(SETTINGS_FAILED({ file, message: (err as Error).message }));
    return 1;
  }
  const cleaned = cleanLegacyKeys(cleanAutoMode(cleanGitConfig(current)));
  const { snippet, kept } = snippetFor(cleaned, ROOT, scope === "project");
  if (advisor === "claudetto")
    snippet["env"] = { ...(snippet["env"] as Json), ...ADVISOR_ENV };
  const changes = (
    ["env", "autoMode", "promptCacheTtl", "enabledPlugins"] as const
  )
    .filter(
      (key) => JSON.stringify(cleaned[key]) !== JSON.stringify(current[key]),
    )
    .map((key) => CLEANED({ key }));
  const settings = merge(cleaned, snippet, changes);
  const mdText = fs.existsSync(claudeMd) ? await Bun.file(claudeMd).text() : "";
  const mdNext = stripBlock(mdText);
  if (mdNext !== mdText) changes.push(CLAUDE_MD_REMOVED({ file: claudeMd }));
  io.log(`Target: ${file} (${scope} scope)`);
  if (scope === "project") io.log(PROJECT_NO_STATUS_LINE);
  for (const key of kept) io.log(KEPT_KEY({ key }));
  io.log(changes.length ? `${changes.length} change(s):` : SETTINGS_MATCH);
  for (const line of changes) io.log(`  ${line}`);
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
