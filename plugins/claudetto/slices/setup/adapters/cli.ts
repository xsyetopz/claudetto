// The CLI `claudetto-setup` of the `setup` slice. The launcher `bin/claudetto-setup` calls `main`.
//
//   claudetto-setup [--scope user|project|local] [--apply]
//
// It cleans the keys of 0.1.0 and 0.2.0 out of the settings file and out of `CLAUDE.md`, then merges the settings snippet into the settings file.
// It writes nothing without `--apply`.
// With `--apply`, in a project with `.git/`, it also appends the local files of claudetto to `.gitignore`.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { writeAtomic } from "../../../kernel/node/fs.ts";
import {
  CLAUDE_DIR,
  CLAUDE_STATE_FILE,
  PROJECT_LOCAL_SETTINGS,
  PROJECT_SETTINGS,
  SETTINGS_FILE,
} from "../../../kernel/paths.ts";
import {
  cleanGitConfig,
  cleanLegacyKeys,
  cleanUpgrade,
  stripBlock,
} from "../domain/cleanup.ts";
import { withIgnores } from "../domain/gitignore.ts";
import { isObject, type Json, merge, snippetFor } from "../domain/merge.ts";
import { planCap } from "../domain/plan.ts";
import {
  CLAUDE_MD_REMOVED,
  CLEANED,
  CONTEXT7_FOUND,
  DRY_RUN,
  KEPT_KEY,
  NO_PLAN_CAP,
  PROJECT_NO_PLAN_CAP,
  PROJECT_NO_STATUS_LINE,
  REMOVED_RULE,
  SCOPE_MISSING,
  SETTINGS_FAILED,
  SETTINGS_MATCH,
  UNKNOWN_SCOPE,
  USAGE,
  WROTE,
} from "../prompts.ts";

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

/** Appends the local files of claudetto to the `.gitignore` of the project, when the project has `.git/`. */
const ignoreLocal = async (projectDir: string): Promise<void> => {
  if (!fs.existsSync(path.join(projectDir, ".git"))) return;
  const file = path.join(projectDir, ".gitignore");
  const text = fs.existsSync(file) ? await Bun.file(file).text() : "";
  const next = withIgnores(text);
  if (next !== text) await writeAtomic(file, next);
};

/** The size of the frontmatter `description` of the skill file `text`, or of all of `text` when it has none. */
const descriptionChars = (text: string): number => {
  try {
    const meta = Bun.YAML.parse(text.split(/^---$/m)[1] ?? "") as Json | null;
    const description = meta?.["description"];
    if (typeof description === "string") return description.length;
  } catch {}
  return text.length;
};

/** The official Context7 skill `find-docs` and the Context7 rules in `dir`, each with the characters that it adds to each session. */
const context7Files = async (dir: string): Promise<[string, number][]> => {
  const found: [string, number][] = [];
  const skill = path.join(dir, "skills", "find-docs", "SKILL.md");
  if (fs.existsSync(skill))
    found.push([skill, descriptionChars(await Bun.file(skill).text())]);
  const rules = path.join(dir, "rules");
  const names = fs.existsSync(rules) ? fs.readdirSync(rules) : [];
  for (const name of names.filter((n) => /context7.*\.md$/i.test(n)).sort()) {
    const file = path.join(rules, name);
    found.push([file, (await Bun.file(file).text()).length]);
  }
  return found;
};

/** The scope of the arguments, or the message to print when they are wrong. */
const parseOptions = (
  args: string[],
): { apply: boolean; scope: string } | { error: string } => {
  const at = args.indexOf("--scope");
  const scope = at < 0 ? "user" : args[at + 1];
  const bad = args.filter(
    (a, i) => !["--apply", "--scope"].includes(a) && !(i > 0 && at === i - 1),
  );
  if (bad.length > 0) return { error: USAGE };
  if (!scope || scope.startsWith("--")) return { error: SCOPE_MISSING };
  return { apply: args.includes("--apply"), scope };
};

const scopeFiles = (
  scope: string,
  configDir: string,
  projectDir: string,
): [string, string] | undefined => {
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
  return Object.hasOwn(files, scope) ? files[scope] : undefined;
};

const askOf = (s: Json): unknown[] =>
  isObject(s["permissions"]) && Array.isArray(s["permissions"]["ask"])
    ? s["permissions"]["ask"]
    : [];

/** The messages for the keys and the `ask` rules that the cleaning removed. */
const cleaningChanges = (current: Json, cleaned: Json): string[] => {
  const changes = Object.keys(current)
    .filter((k) => JSON.stringify(cleaned[k]) !== JSON.stringify(current[k]))
    .map((key) => CLEANED({ key }));
  const keptAsk = askOf(cleaned);
  for (const rule of askOf(current))
    if (!keptAsk.includes(rule))
      changes.push(REMOVED_RULE({ rule: String(rule) }));
  return changes;
};

/** Prints the target, the notes, the `context7` files, and the changes. */
const report = async (
  io: Io,
  info: {
    file: string;
    scope: string;
    cap: unknown;
    tier: string;
    kept: string[];
    dirs: string[];
    changes: string[];
  },
): Promise<void> => {
  const { file, scope, cap, tier, kept, dirs, changes } = info;
  io.log(`Target: ${file} (${scope} scope)`);
  if (scope === "project") io.log(PROJECT_NO_STATUS_LINE);
  if (scope === "project") io.log(PROJECT_NO_PLAN_CAP);
  else if (!cap) io.log(NO_PLAN_CAP({ tier }));
  for (const key of kept) io.log(KEPT_KEY({ key }));
  for (const dir of new Set(dirs))
    for (const [found, chars] of await context7Files(dir))
      io.log(CONTEXT7_FOUND({ file: found, chars }));
  io.log(changes.length ? `${changes.length} change(s):` : SETTINGS_MATCH);
  for (const line of changes) io.log(`  ${line}`);
};

/** Writes the settings file, and the `CLAUDE.md` file when its text changed. */
const writeAll = async (
  file: string,
  settings: Json,
  claudeMd: string,
  mdNext: string,
  mdChanged: boolean,
): Promise<void> => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  await writeAtomic(file, `${JSON.stringify(settings, null, 2)}\n`);
  if (mdChanged) await writeAtomic(claudeMd, mdNext);
};

/** Run the CLI with `args` and return the exit status. */
export const main = async (
  args: string[],
  env: NodeJS.ProcessEnv = process.env,
  cwd: string = process.cwd(),
  io: Io = consoleIo,
): Promise<number> => {
  const options = parseOptions(args);
  if ("error" in options) return fail(io, options.error);
  const { apply, scope } = options;
  const configDir =
    env["CLAUDE_CONFIG_DIR"] || path.join(os.homedir(), CLAUDE_DIR);
  const projectDir = path.resolve(env["CLAUDE_PROJECT_DIR"] || cwd);
  const [file, claudeMd] = scopeFiles(scope, configDir, projectDir) ?? [];
  if (!file || !claudeMd) return fail(io, UNKNOWN_SCOPE({ scope }));
  const current = await readReported(file, io);
  if (!current) return 1;
  const cleaned = cleanLegacyKeys(cleanGitConfig(current));
  const changes = cleaningChanges(current, cleaned);
  const upgraded = cleanUpgrade(cleaned, changes);
  const { snippet, kept } = snippetFor(upgraded, ROOT, scope === "project");
  const state = await readSettings(
    path.join(env["CLAUDE_CONFIG_DIR"] || os.homedir(), CLAUDE_STATE_FILE),
  ).catch(() => ({}));
  const { cap, tier } = planCap(state);
  if (cap && scope !== "project")
    snippet["env"] = {
      ...(snippet["env"] as Json),
      CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS: String(cap),
    };
  const settings = merge(upgraded, snippet, changes);
  const mdText = fs.existsSync(claudeMd) ? await Bun.file(claudeMd).text() : "";
  const mdNext = stripBlock(mdText);
  if (mdNext !== mdText) changes.push(CLAUDE_MD_REMOVED({ file: claudeMd }));
  const dirs = [configDir, path.join(projectDir, CLAUDE_DIR)];
  await report(io, { file, scope, cap, tier, kept, dirs, changes });
  if (apply) await ignoreLocal(projectDir);
  if (!changes.length) return 0;
  if (!apply) {
    io.log(`\n${DRY_RUN}`);
    return 0;
  }
  await writeAll(file, settings, claudeMd, mdNext, mdText !== mdNext);
  io.log(`\n${WROTE({ file })}`);
  return 0;
};
