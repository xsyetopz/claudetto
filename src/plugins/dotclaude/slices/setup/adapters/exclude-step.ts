// The exclude step of the CLI: add the runtime paths of `.claude/` and `.dotclaude/` to `.git/info/exclude`.
// A folder that is not in a git repository gets no change.

import fs from "node:fs";
import path from "node:path";
import { runProgram } from "../../../../../kernel/node/process.ts";
import {
  excludeLines,
  RUNTIME_PATTERNS,
  samplePath,
} from "../domain/exclude.ts";

/** The exit code and stdout of `git args` in `cwd` with `env`, or `undefined` when git is not found. */
const git = (args: string[], cwd: string, env: NodeJS.ProcessEnv) => {
  try {
    const result = runProgram("git", args, {
      cwd,
      env,
      stdin: "ignore",
      stdout: "pipe",
      stderr: "ignore",
      timeout: 10_000,
    });
    return {
      code: result.exitCode,
      out: (result.stdout?.toString() ?? "").trim(),
    };
  } catch {
    return undefined;
  }
};

/**
 * The lines that this step added to `.git/info/exclude` of the repository of `cwd`, or `[]`.
 * Git reads its config and ignore files from `env`, so a caller can hide the user's own.
 */
export const excludeRuntimePaths = async (
  cwd: string,
  env: NodeJS.ProcessEnv = process.env,
): Promise<string[]> => {
  const found = git(["rev-parse", "--git-path", "info/exclude"], cwd, env);
  if (found?.code !== 0 || !found.out) return [];
  const target = path.resolve(cwd, found.out);
  const ignored = RUNTIME_PATTERNS.filter(
    (pattern) =>
      git(["check-ignore", "-q", samplePath(pattern)], cwd, env)?.code === 0,
  );
  const file = Bun.file(target);
  const text = (await file.exists()) ? await file.text() : "";
  const lines = excludeLines(text, ignored);
  if (lines.length === 0) return [];
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const lead = text === "" || text.endsWith("\n") ? "" : "\n";
  fs.appendFileSync(target, `${lead}${lines.join("\n")}\n`);
  return lines;
};
