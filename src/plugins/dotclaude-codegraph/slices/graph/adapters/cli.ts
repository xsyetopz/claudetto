// The command `dotclaude-codegraph-check`: it prints whether `codegraph` is on `PATH` and whether this project has an index.
// It prints the install command when the CLI is missing, and never installs it.

import { checkLines } from "../domain/graph.ts";
import { QUERY_TIMEOUT_MS } from "../limits.ts";
import { codegraph, indexed } from "./codegraph.ts";

/** The lines of the check for `root`. */
export const check = (root: string, env: NodeJS.ProcessEnv): string[] => {
  const version = codegraph(["--version"], {
    root,
    env,
    timeout: QUERY_TIMEOUT_MS,
  });
  return checkLines(version.ok, version.stdout.trim(), indexed(root));
};

/** Prints the check for the current folder. Returns the exit code, which is 0 also when the CLI is missing, because the text then tells the user what to do. */
export const main = (_argv: readonly string[]): number => {
  console.log(check(process.cwd(), process.env).join("\n"));
  return 0;
};
