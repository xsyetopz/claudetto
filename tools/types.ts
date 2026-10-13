#!/usr/bin/env -S bun --no-env-file
// The Claude Code types of the plugins, which `just typecheck` needs (wiki, "Types").
// Claude Code writes `.claude-plugin/types/` and a `tsconfig.json` into each plugin folder that an interactive session loads, and git ignores them.
// A linked worktree has none of these files, so this script copies each one that the worktree lacks from the main worktree.

import fs from "node:fs";
import path from "node:path";
import { $ } from "bun";

/** The entries that Claude Code writes into a plugin folder. */
const WRITTEN = [path.join(".claude-plugin", "types"), "tsconfig.json"];

/** The types that the root `tsconfig.json` reads, relative to the repository. */
const NEEDED = path.join(
  "plugins",
  "dotclaude",
  ".claude-plugin",
  "types",
  "tsconfig.json",
);

/** The main worktree of the repository at `root`, or `null` when `root` is not a linked worktree. */
export const mainWorktree = async (root: string): Promise<string | null> => {
  const r =
    await $`git rev-parse --path-format=absolute --git-dir --git-common-dir`
      .cwd(root)
      .quiet()
      .nothrow();
  if (r.exitCode !== 0) return null;
  const [dir, common] = r.stdout.toString().trim().split("\n");
  if (!dir || !common || path.resolve(dir) === path.resolve(common))
    return null;
  return path.dirname(path.resolve(common));
};

/** Copies each entry of `WRITTEN` that a plugin folder of `to` lacks and the same folder of `from` has. It gives the copied paths, relative to `to`. */
export const copyTypes = (from: string, to: string): string[] => {
  const plugins = path.join(to, "plugins");
  if (!fs.existsSync(plugins)) return [];
  const copied: string[] = [];
  for (const entry of fs.readdirSync(plugins, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    for (const part of WRITTEN) {
      const rel = path.join("plugins", entry.name, part);
      if (fs.existsSync(path.join(to, rel))) continue;
      if (!fs.existsSync(path.join(from, rel))) continue;
      fs.cpSync(path.join(from, rel), path.join(to, rel), { recursive: true });
      copied.push(rel);
    }
  }
  return copied;
};

if (process.argv[1] === import.meta.path) {
  const repo = path.resolve(import.meta.dir, "..");
  const main = await mainWorktree(repo);
  if (main)
    for (const rel of copyTypes(main, repo))
      console.log(`Copied ${rel} from ${main}`);
  if (!fs.existsSync(path.join(repo, NEEDED))) {
    console.error(
      `${NEEDED} is missing. Start an interactive Claude Code session that loads the plugins of this checkout, such as \`just sandbox\`, and run the type check again.`,
    );
    process.exit(1);
  }
}
