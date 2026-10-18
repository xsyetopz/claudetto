#!/usr/bin/env bun
// Validates the marketplace and each plugin with `claude plugin validate --strict`,
// and fails when a repository file is over its line bound.
// The bounds and the rule are in `CLAUDE.md`, "Rules".
//
//   bun tools/validate.ts   exit 0 when each manifest, skill, and agent is valid,
//                           and each file is within its line bound

import { readdirSync } from "node:fs";
import path, { join } from "node:path";
import { replyOnlyCasesIn } from "./eval-checks.ts";
import { discover } from "./generate/discover.ts";
import "./generate/emit/slices.ts"; // registers the loader that discovery needs for the `prompts.ts` modules
import { isGenerated } from "./generate/emit/texts.ts";
import { FILE_MAX_LINES, TEST_FILE_MAX_LINES } from "./limits.ts";
import {
  missingControls,
  overPins,
  partLines,
  shortFiles,
  thinFolders,
} from "./parts.ts";
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

/** The lines of a text: a final newline does not start a line. */
export const lineCount = (text: string): number =>
  text.split("\n").length - (text.endsWith("\n") ? 1 : 0);

/** The files under `dir` that are over their bound, as "lines file". */
export const overBound = async (
  dir: string,
  files: string[],
): Promise<string[]> => {
  const over = [];
  for (const f of files) {
    if (!TEXT.test(f) || GENERATED.some((g) => g.test(f))) continue;
    const file = Bun.file(path.join(dir, f));
    if (!(await file.exists())) continue;
    const text = await file.text();
    if (GENERATED_DIRS.some((g) => g.test(f)) && isGenerated(text)) continue;
    const lines = lineCount(text);
    if (lines > bound(f)) over.push(`${lines} ${f}`);
  }
  return over;
};

/** The `key: value` lines of the frontmatter of an agent file. */
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
  const files = visibleFiles(root);
  const counts = new Map<string, number>();
  for (const f of files) {
    const file = Bun.file(join(root, f));
    if (/\.ts$/.test(f) && (await file.exists()))
      counts.set(f, lineCount(await file.text()));
  }
  const present = files.filter((f) => !f.endsWith(".ts") || counts.has(f));
  const linesOf = (f: string): number => counts.get(f) ?? 0;
  const parts = [
    ...overPins(partLines(present, linesOf)),
    ...shortFiles(present, linesOf),
    ...thinFolders(present),
    ...missingControls(await discover(root)),
    ...(await replyOnlyCasesIn(root)).map(
      (f) => `${f}: no check of a file or a tool call (D25)`,
    ),
  ];
  if (parts.length) {
    for (const line of parts) console.error(`part rule: ${line}`);
    process.exit(1);
  }
  await $claude()`claude plugin validate --strict ${root}`;
  for (const entry of readdirSync(plugins, { withFileTypes: true })) {
    if (entry.isDirectory())
      await $claude()`claude plugin validate --strict ${join(plugins, entry.name)}`;
  }
}
