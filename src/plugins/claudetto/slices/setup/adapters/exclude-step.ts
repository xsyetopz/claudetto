// The exclude step of the CLI: add the runtime paths of `.claude/` and `.claudetto/` to `.git/info/exclude`.
// The logic is in `hook-exclude.ts`, which the `session.start` hook also uses.
// A folder that is not in a git repository gets no change.

import fs from "node:fs";
import path from "node:path";
import { git } from "./git.ts";
import { addExcludes } from "./hook-exclude.ts";

/**
 * The lines that this step added to `.git/info/exclude` of the repository of `cwd`, or `[]`.
 * Git reads its config and ignore files from `env`, so a caller can hide the user's own.
 */
export const excludeRuntimePaths = (
  cwd: string,
  env: NodeJS.ProcessEnv = process.env,
): Promise<string[]> =>
  addExcludes({
    git: async (args) => git(args, cwd, env),
    read: async (file) => {
      const target = path.resolve(cwd, file);
      return fs.existsSync(target) ? await Bun.file(target).text() : "";
    },
    write: async (file, text) => {
      const target = path.resolve(cwd, file);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      await Bun.write(target, text);
    },
  });
