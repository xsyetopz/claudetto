// The rebuild list `tools/rebuild-pending.txt` (design, "The rebuild branch"): the 0.28.0 paths that no package has ported yet.
// A line that ends with `/` names a folder and each file in it.
// A line that starts with `#` is a comment, and a blank line names nothing.
// The generator fails on a file in `plugins/` that it did not write and that the list does not name.

import fs from "node:fs";
import path from "node:path";

export const PENDING_FILE = "tools/rebuild-pending.txt";

/** The paths of the list text `text`, with no comment and no blank line. */
export const parsePending = (text: string): string[] =>
  text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "" && !line.startsWith("#"));

/** True when `file` is a path of `entries`, or a file in a folder of `entries`. */
export const isPending = (entries: string[], file: string): boolean =>
  entries.some((e) => (e.endsWith("/") ? file.startsWith(e) : file === e));

/** The files in `plugins/` of the git repository `root` that git does not ignore. */
const pluginFiles = (root: string): string[] => {
  const run = Bun.spawnSync(
    [
      "git",
      "ls-files",
      "--cached",
      "--others",
      "--exclude-standard",
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
    .split("\n")
    .filter((file) => file !== "" && fs.existsSync(path.join(root, file)));
};

/** The messages for each file in `plugins/` of `root` that is not in `written` and that the list does not name. */
export const unlisted = async (
  root: string,
  written: string[],
): Promise<string[]> => {
  const list = path.join(root, PENDING_FILE);
  const entries = fs.existsSync(list)
    ? parsePending(await Bun.file(list).text())
    : [];
  const made = new Set(written);
  return pluginFiles(root)
    .filter((file) => !made.has(file) && !isPending(entries, file))
    .map(
      (file) =>
        `${file} has no source in src/, and ${PENDING_FILE} does not name it. Add its source to src/, or delete it.`,
    );
};
