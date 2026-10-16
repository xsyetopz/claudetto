// The checks of rule files (`.claude/rules/*.md`) that need no model: the `paths` front matter, the brace budget, and the rules in the context.
// The functions are pure, so a hooks module and a CLI share them.
// The caller gives the YAML parser and the glob matcher, because a hooks module has no `Bun` and no `node:` module.

import { MAX_PATTERNS } from "./budget.ts";
import { rethrowUnless } from "./errors.ts";

/**
 * A YAML parser. It throws a `SyntaxError` (`Bun.YAML.parse`) or a `YAMLParseError` (the `yaml` package)
 * when the text is not valid YAML.
 */
export type ParseYaml = (text: string) => unknown;

/** A glob matcher: whether `file` (relative to the project) matches `glob`. */
export type MatchGlob = (glob: string, file: string) => boolean;

/** One problem of a rule. `yaml`: the front matter does not parse. `budget`: the braces expand over the budget. `no-match`: `glob` matches no file. `git`: the list of files failed, so no glob could be checked. */
export type RuleProblem = {
  readonly rule: string;
  readonly kind: "yaml" | "budget" | "no-match" | "git";
  readonly glob?: string;
  readonly count?: number;
};

/** The front matter text of a rule, or undefined when the rule has none. */
export const frontOf = (text: string): string | undefined =>
  /^---\r?\n([\s\S]*?)\r?\n---/.exec(text)?.[1];

/** The `paths` globs of a parsed front matter. A value that is not a list or a string gives none. */
export const pathsOf = (front: unknown): string[] => {
  const value = (front as { paths?: unknown } | null)?.paths;
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string")
    return value
      .split(",")
      .map((g) => g.trim())
      .filter(Boolean);
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

/**
 * The problems of one rule file.
 * A front matter that does not parse gives one `yaml` problem and no other, because Claude Code then loads the rule as if it had no `paths`.
 * `files` are the tracked files, relative to the project.
 */
export const checkRule = (
  rule: string,
  text: string,
  files: readonly string[],
  parse: ParseYaml,
  match: MatchGlob,
): RuleProblem[] => {
  const head = frontOf(text);
  if (head === undefined) return [];
  let front: unknown;
  try {
    front = parse(head);
  } catch (err) {
    rethrowUnless(err, "SyntaxError", "YAMLParseError");
    return [{ rule, kind: "yaml" }];
  }
  const globs = pathsOf(front);
  const problems: RuleProblem[] = [];
  const count = globs.reduce((n, g) => n + expansions(g), 0);
  if (count > MAX_PATTERNS) problems.push({ rule, kind: "budget", count });
  for (const glob of globs)
    if (!files.some((f) => match(glob, f)))
      problems.push({ rule, kind: "no-match", glob });
  return problems;
};
