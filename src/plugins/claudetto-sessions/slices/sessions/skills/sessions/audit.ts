// Reads a `~/.claude/` folder and a project folder, with no model call, and prints JSON:
// the keys that each settings layer sets, the plugins that are on, the hooks, and the bytes of each text that loads at the start of a session.
//
//   bun audit.ts [--home DIR] [--project DIR] [--managed FILE]

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const flag = (name: string, fallback: string): string => {
  const at = Bun.argv.indexOf(name);
  return at < 0 ? fallback : (Bun.argv[at + 1] ?? fallback);
};

const HOME = flag("--home", path.join(os.homedir(), ".claude"));
const PROJECT = flag("--project", process.cwd());
const MANAGED = flag(
  "--managed",
  process.platform === "darwin"
    ? path.join(
        "/Library",
        "Application Support",
        "ClaudeCode",
        "managed-settings.json",
      )
    : path.join("/etc", "claude-code", "managed-settings.json"),
);

interface Json {
  enabledPlugins?: Record<string, unknown>;
  hooks?: Record<string, unknown[]>;
}

const readJson = async (file: string): Promise<Json | null> =>
  fs.existsSync(file) ? ((await Bun.file(file).json()) as Json) : null;

const size = (file: string): number =>
  fs.existsSync(file) ? fs.statSync(file).size : 0;

/** The files of the folder `dir` that match `glob`, sorted. Missing folder gives none. */
const files = (dir: string, glob: string): string[] =>
  fs.existsSync(dir)
    ? [...new Bun.Glob(glob).scanSync({ cwd: dir })].sort()
    : [];

/** The frontmatter `name` and `description` of a skill or agent file, which is what its listing sends. */
const listing = async (file: string): Promise<number> => {
  const text = await Bun.file(file).text();
  const head = /^---\n([\s\S]*?)\n---/.exec(text)?.[1] ?? "";
  const pick = (key: string) =>
    new RegExp(`^${key}:\\s*(.*)$`, "m").exec(head)?.[1] ?? "";
  return Buffer.byteLength(`${pick("name")}: ${pick("description")}`);
};

const layers = {
  managed: MANAGED,
  user: path.join(HOME, "settings.json"),
  project: path.join(PROJECT, ".claude", "settings.json"),
  local: path.join(PROJECT, ".claude", "settings.local.json"),
};

const settings: Record<string, string[]> = {};
const plugins: Record<string, unknown> = {};
const hooks: Record<string, Record<string, number>> = {};
for (const [layer, file] of Object.entries(layers)) {
  const json = await readJson(file);
  if (!json) continue;
  settings[layer] = Object.keys(json).sort();
  Object.assign(plugins, json.enabledPlugins);
  hooks[layer] = Object.fromEntries(
    Object.entries(json.hooks ?? {}).map(([event, groups]) => [
      event,
      groups.length,
    ]),
  );
}

const PROJECT_DIR = path.join(PROJECT, ".claude");
const roots = [HOME, PROJECT_DIR];

/** The bytes of each file `measure` reads, by path, for the files under `<root>/<dir>` that match `glob`. */
const sized = async (
  dir: string,
  glob: string,
  measure: (file: string) => number | Promise<number>,
) => {
  const out: Record<string, number> = {};
  for (const root of roots)
    for (const rel of files(path.join(root, dir), glob)) {
      const file = path.join(root, dir, rel);
      out[file] = await measure(file);
    }
  return out;
};

const memory: Record<string, number> = {};
for (const file of [
  path.join(HOME, "CLAUDE.md"),
  path.join(PROJECT, "CLAUDE.md"),
  path.join(PROJECT_DIR, "CLAUDE.md"),
  path.join(PROJECT, "CLAUDE.local.md"),
]) {
  const bytes = size(file);
  if (bytes) memory[file] = bytes;
}

// A rule with a `paths:` frontmatter loads only when Claude works on a matching file.
const rules = await sized("rules", "**/*.md", size);
const onMatch: Record<string, number> = {};
for (const file of Object.keys(rules))
  if (/^---\n[\s\S]*?^paths:/m.test(await Bun.file(file).text())) {
    onMatch[file] = rules[file] as number;
    delete rules[file];
  }

console.log(
  JSON.stringify(
    {
      settings,
      plugins,
      hooks,
      bytes: {
        memory,
        rules,
        onMatch,
        skills: await sized("skills", "*/SKILL.md", listing),
        agents: await sized("agents", "*.md", listing),
      },
    },
    null,
    2,
  ),
);
