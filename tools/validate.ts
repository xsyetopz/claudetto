#!/usr/bin/env bun
// Validates the marketplace and each plugin with `claude plugin validate --strict`,
// and fails when a repository file is over its line bound.
// The bounds and the rule are in `CLAUDE.md`, "Rules".
//
//   bun tools/validate.ts   exit 0 when each manifest, skill, and agent is valid,
//                           and each file is within its line bound

import fs, { readdirSync } from "node:fs";
import path, { join } from "node:path";
import {
  AGENT_EFFORT_FLOOR,
  AGENT_EFFORTS,
} from "../src/plugins/claudetto/slices/agents/limits.ts";
import { isGenerated } from "./generate/emit/texts.ts";
import { FILE_MAX_LINES, TEST_FILE_MAX_LINES } from "./limits.ts";
import { $claude } from "./telemetry.ts";

const root = join(import.meta.dir, "..");
const plugins = join(root, "plugins");

const TEXT =
  /(?:\.(?:mjs|cjs|js|ts|json|jsonc|md|mdx|py|sh|toml|ya?ml|txt|grit)|(?:^|\/)justfile)$/;
// Files that a tool writes: the settings schemas of `just schema`, the eval
// manifests of `just generate`, which are JSON and cannot hold the generated
// header, the skills of `openspec init` (the user, 2026-10-15), and lock files.
const GENERATED = [
  /^schemas\//,
  /^plugins\/[^/]+\/evals\/hooks\.json$/,
  /^\.claude\/skills\/openspec-[^/]+\//,
  /(?:^|\/)(?:package-lock\.json|pnpm-lock\.yaml)$/,
];
// The folders whose files `just generate` writes. Only a file here may carry
// the generated header and be out of the bound, so a hand-written copy of the
// header stays bounded.
const GENERATED_DIRS = [/^plugins\//, /^schemas\//];

const bound = (file: string): number =>
  /\.test\.[^/]+$/.test(file) ? TEST_FILE_MAX_LINES : FILE_MAX_LINES;

/** The files under `dir` that are over their bound, as "lines file". */
export const overBound = async (
  dir: string,
  files: string[],
): Promise<string[]> => {
  const over = [];
  for (const f of files) {
    if (!TEXT.test(f) || GENERATED.some((g) => g.test(f))) continue;
    if (!fs.existsSync(path.join(dir, f))) continue;
    const text = await Bun.file(path.join(dir, f)).text();
    if (GENERATED_DIRS.some((g) => g.test(f)) && isGenerated(text)) continue;
    const lines = text.split("\n").length - (text.endsWith("\n") ? 1 : 0);
    if (lines > bound(f)) over.push(`${lines} ${f}`);
  }
  return over;
};

/** The `key: value` lines of the frontmatter of an agent file. */
const frontMatter = (text: string): Record<string, string> => {
  const lines = text.split("\n");
  if (lines[0] !== "---") return {};
  const end = lines.indexOf("---", 1);
  return Object.fromEntries(
    lines
      .slice(1, end < 0 ? 1 : end)
      .filter((line) => line.includes(":"))
      .map((line) => [
        line.slice(0, line.indexOf(":")),
        line.slice(line.indexOf(":") + 1).trim(),
      ]),
  );
};

/**
 * The faults of an agent file: an `effort` below the floor or absent, and a `maxTurns` that is not a positive integer.
 * The floor is `AGENT_EFFORT_FLOOR`, because Sonnet 5.5 and Haiku 5.5 skip checks at `low`.
 */
export const agentFaults = (name: string, text: string): string[] => {
  const fm = frontMatter(text);
  const faults: string[] = [];
  const rank = AGENT_EFFORTS.indexOf(fm["effort"] as never);
  if (rank < AGENT_EFFORTS.indexOf(AGENT_EFFORT_FLOOR))
    faults.push(
      `${name}: effort is ${fm["effort"] ?? "absent"}, below ${AGENT_EFFORT_FLOOR}`,
    );
  const turns = Number(fm["maxTurns"]);
  if (!Number.isInteger(turns) || turns < 1)
    faults.push(`${name}: maxTurns is not a positive integer`);
  return faults;
};

/** The faults of each agent file under the `agents/` folder of each plugin in `dir`. */
const agentFaultsIn = async (dir: string): Promise<string[]> => {
  const faults: string[] = [];
  for (const file of new Bun.Glob("*/agents/*.md").scanSync(dir))
    faults.push(...agentFaults(file, await Bun.file(join(dir, file)).text()));
  return faults;
};

/** The files that git does not ignore: tracked and untracked, so `external/` and `node_modules/` are out. */
const visibleFiles = (dir: string): string[] => {
  const r = Bun.spawnSync(
    ["git", "ls-files", "--cached", "--others", "--exclude-standard"],
    { cwd: dir },
  );
  if (r.exitCode !== 0) throw new Error(`git ls-files failed in ${dir}`);
  return r.stdout.toString().split("\n").filter(Boolean);
};

if (import.meta.main) {
  const over = await overBound(root, visibleFiles(root));
  if (over.length) {
    for (const line of over) console.error(`over the line bound: ${line}`);
    process.exit(1);
  }
  const weak = await agentFaultsIn(plugins);
  if (weak.length) {
    for (const line of weak) console.error(`agent fault: ${line}`);
    process.exit(1);
  }
  await $claude()`claude plugin validate --strict ${root}`;
  for (const entry of readdirSync(plugins, { withFileTypes: true })) {
    if (entry.isDirectory())
      await $claude()`claude plugin validate --strict ${join(plugins, entry.name)}`;
  }
}
