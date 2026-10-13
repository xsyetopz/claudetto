// The file mode of the generated programs: a launcher in `bin/` and a scaffold script `.sh` of an eval case run as programs.

import fs from "node:fs";
import path from "node:path";
import type { Output } from "./emit/texts.ts";

/** A launcher in `bin/` of a plugin, or a scaffold script of an eval case, which run as programs. */
export const LAUNCHER =
  /^plugins\/[^/]+\/bin\/|^plugins\/[^/]+\/evals\/.+\.sh$/;

const EXECUTABLE = 0o755;
const EXEC_BITS = 0o111;

/** Sets the mode 755 on each file of `made` that runs as a program, whether its text changed or not. */
export const setModes = (root: string, made: Output[]): void => {
  for (const o of made)
    if (LAUNCHER.test(o.file) && fs.existsSync(path.join(root, o.file)))
      fs.chmodSync(path.join(root, o.file), EXECUTABLE);
};

/** The files of the git index of `root` in `plugins/` that have the mode `100755`. */
const indexedPrograms = (root: string): Set<string> => {
  const run = Bun.spawnSync(["git", "ls-files", "--stage", "--", "plugins"], {
    cwd: root,
    stdout: "pipe",
    stderr: "pipe",
  });
  if (run.exitCode !== 0)
    throw new Error(
      `git ls-files failed in ${root}: ${run.stderr.toString().trim()}`,
    );
  return new Set(
    run.stdout
      .toString()
      .split("\n")
      .filter((line) => line.startsWith("100755 "))
      .map((line) => line.slice(line.indexOf("\t") + 1)),
  );
};

/** Whether a file of `root` has `+x`: the file system on POSIX, and the git index on Windows, which has no mode bits. */
const executable = (
  root: string,
  platform: NodeJS.Platform,
): ((file: string) => boolean) => {
  if (platform !== "win32")
    return (file) =>
      (fs.statSync(path.join(root, file)).mode & EXEC_BITS) !== 0;
  const programs = indexedPrograms(root);
  return (file) => programs.has(file);
};

/** The messages for each file of `made` that runs as a program and has no `+x` in `root`. */
export const modeProblems = (
  root: string,
  made: Output[],
  platform: NodeJS.Platform = process.platform,
): string[] => {
  const programs = made.filter(
    (o) => LAUNCHER.test(o.file) && fs.existsSync(path.join(root, o.file)),
  );
  if (programs.length === 0) return [];
  const hasX = executable(root, platform);
  const fix = (file: string): string =>
    platform === "win32" ? `git add --chmod=+x ${file}` : "just generate";
  return programs
    .filter((o) => !hasX(o.file))
    .map(
      (o) =>
        `${o.file} runs as a program and has no \`+x\` mode. Run \`${fix(o.file)}\`.`,
    );
};
