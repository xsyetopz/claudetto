// The check of the files in `plugins/` that the generator did not write (design, "Generated tree").
// A file in `plugins/` needs a source in `src/`, so a hand-written file cannot stay in the output.

import fs from "node:fs";
import path from "node:path";

/**
 * The files in `plugins/` of the git repository `root` that git does not ignore.
 * `-z` gives each name as it is, because git quotes a name with a non-ASCII character in the plain output.
 */
const pluginFiles = (root: string): string[] => {
  const run = Bun.spawnSync(
    [
      "git",
      "ls-files",
      "--cached",
      "--others",
      "--exclude-standard",
      "-z",
      "--",
      "plugins",
    ],
    { cwd: root, stdout: "pipe", stderr: "pipe" },
  );
  if (run.exitCode !== 0)
    throw new Error(
      `git ls-files failed in ${root}: ${run.stderr.toString().trim()}`,
    );
  return run.stdout
    .toString()
    .split("\0")
    .filter((file) => file !== "" && fs.existsSync(path.join(root, file)));
};

/** The messages for each file in `plugins/` of `root` that is not in `written`. */
export const strays = async (
  root: string,
  written: string[],
): Promise<string[]> => {
  const made = new Set(written);
  return pluginFiles(root)
    .filter((file) => !made.has(file))
    .map(
      (file) =>
        `${file} has no source in src/. Add its source to src/, or delete it.`,
    );
};
