// Checks the `paths` globs of rule files.
// Each glob must match a file, the front matter must parse, and one rule must stay under 1,000 expanded patterns.
// The script does not check the 4 MiB part of the brace budget.
// The script matches with `Bun.Glob`, which can differ from the matcher of Claude Code.
// Usage: `bun check-globs.ts <rules-dir> [<project-dir>]`.
// The exit status is 1 when a check fails, and 2 for a usage error, a missing rules folder, or a folder that is not a git repository.

import fs from "node:fs";

/** Most expanded patterns that one rule can have (the budget of Claude Code). */
export const MAX_PATTERNS = 1000;

/** The `paths` globs in the front matter of a rule. A rule with no `paths` key has none. Throws when the YAML does not parse. */
export const pathsOf = (text: string): string[] => {
  const head = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  if (!head) return [];
  let front: unknown;
  try {
    front = Bun.YAML.parse(head[1] ?? "");
  } catch (e) {
    throw new Error(
      `front matter does not parse: ${e instanceof Error ? e.message : String(e)}`,
    );
  }
  const value = (front as { paths?: unknown } | null)?.paths;
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string") {
    return value
      .split(",")
      .map((g) => g.trim())
      .filter(Boolean);
  }
  return [];
};

/** The number of patterns that the braces of one glob expand to. */
export const expansions = (glob: string): number => {
  // Each open brace pushes the state of its parent: the product so far and the sum of the finished alternatives.
  const stack: { product: number; sum: number }[] = [];
  let product = 1;
  let sum = 0;
  for (const ch of glob) {
    if (ch === "{") {
      stack.push({ product, sum });
      product = 1;
      sum = 0;
    } else if (ch === "," && stack.length > 0) {
      sum += product;
      product = 1;
    } else if (ch === "}" && stack.length > 0) {
      const parent = stack.pop() ?? { product: 1, sum: 0 };
      product = parent.product * (sum + product);
      sum = parent.sum;
    }
  }
  return product;
};

export type Problem = { rule: string; glob?: string; reason: string };

/** The problems of one rule: a brace budget overflow, and each glob that matches no file. */
export const check = (
  rule: string,
  globs: string[],
  files: string[],
): Problem[] => {
  const problems: Problem[] = [];
  const count = globs.reduce((n, g) => n + expansions(g), 0);
  if (count > MAX_PATTERNS) {
    problems.push({
      rule,
      reason: `${count} expanded patterns, over ${MAX_PATTERNS}`,
    });
  }
  for (const glob of globs) {
    const matcher = new Bun.Glob(glob);
    if (!files.some((f) => matcher.match(f))) {
      problems.push({ rule, glob, reason: "matches no file" });
    }
  }
  return problems;
};

/** The tracked files and the untracked files that the ignore rules keep, relative to `cwd`. Null when `git ls-files` fails. */
const listFiles = (cwd: string): string[] | null => {
  try {
    const r = Bun.spawnSync(
      ["git", "ls-files", "--cached", "--others", "--exclude-standard"],
      { cwd, stderr: "pipe" },
    );
    if (r.exitCode !== 0) return null;
    return r.stdout.toString().split("\n").filter(Boolean);
  } catch {
    return null;
  }
};

const main = async (): Promise<number> => {
  const [rulesDir, projectDir = process.cwd()] = Bun.argv.slice(2);
  if (!rulesDir) {
    console.error("Usage: bun check-globs.ts <rules-dir> [<project-dir>]");
    return 2;
  }
  if (!fs.existsSync(rulesDir) || !fs.statSync(rulesDir).isDirectory()) {
    console.error(`The rules folder does not exist: ${rulesDir}`);
    return 2;
  }
  const files = listFiles(projectDir);
  if (!files) {
    console.error(
      `\`git ls-files\` failed in ${projectDir}. Give a project folder that is a git repository as the second argument.`,
    );
    return 2;
  }
  const rules = [
    ...new Bun.Glob("**/*.md").scanSync({
      cwd: rulesDir,
      absolute: true,
      followSymlinks: true,
    }),
  ].sort();
  const problems: Problem[] = [];
  for (const rule of rules) {
    const text = await Bun.file(rule).text();
    try {
      problems.push(...check(rule, pathsOf(text), files));
    } catch (e) {
      problems.push({
        rule,
        reason: e instanceof Error ? e.message : String(e),
      });
    }
  }
  for (const p of problems) {
    console.log(`${p.rule}${p.glob ? `: ${p.glob}` : ""}: ${p.reason}`);
  }
  console.log(`${rules.length} rules checked, ${problems.length} problems`);
  return problems.length > 0 ? 1 : 0;
};

if (import.meta.main) process.exit(await main());
