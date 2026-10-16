// The command `claudetto-codegraph-check`: it prints whether `codegraph` is on `PATH` and whether this project has an index.
// It prints the install command when the CLI is missing, and never installs it.
// With `--mcp`, it prints the commands that add and remove the `codegraph` MCP server, and runs neither.

import {
  type CliState,
  checkLines,
  failureDetail,
  mcpLines,
} from "../domain/graph.ts";
import { QUERY_TIMEOUT_MS } from "../limits.ts";
import { codegraph, indexed } from "./codegraph.ts";

/** The lines of the check for `root`. */
export const check = (root: string, env: NodeJS.ProcessEnv): string[] => {
  const version = codegraph(["--version"], {
    root,
    env,
    timeout: QUERY_TIMEOUT_MS,
  });
  // A missing CLI has `ENOENT`. Any other failure is a CLI that is installed and failed.
  const cli: CliState = version.ok
    ? { kind: "ok", version: version.stdout.trim() }
    : version.error?.code === "ENOENT"
      ? { kind: "missing" }
      : {
          kind: "failed",
          detail: version.error
            ? version.error.message
            : failureDetail(version.exitCode, version.stderr),
        };
  return checkLines(cli, indexed(root));
};

const USAGE = "Usage: claudetto-codegraph-check [--mcp]";

/** Prints the check for the current folder, or the MCP lines with `--mcp`. Returns the exit code, which is 0 also when the CLI is missing, because the text then tells the user what to do, and 2 for an unknown argument. */
export const main = (argv: readonly string[]): number => {
  if (argv.length === 1 && argv[0] === "--mcp") {
    console.log(mcpLines().join("\n"));
    return 0;
  }
  if (argv.length > 0) {
    console.error(USAGE);
    return 2;
  }
  console.log(check(process.cwd(), process.env).join("\n"));
  return 0;
};
