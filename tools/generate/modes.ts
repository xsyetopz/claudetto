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

/** The messages for each file of `made` that runs as a program and has no `+x` in `root`. */
export const modeProblems = (root: string, made: Output[]): string[] =>
  made
    .filter((o) => LAUNCHER.test(o.file))
    .filter((o) => {
      const at = path.join(root, o.file);
      return fs.existsSync(at) && (fs.statSync(at).mode & EXEC_BITS) === 0;
    })
    .map(
      (o) =>
        `${o.file} runs as a program and has no \`+x\` mode. Run \`just generate\`.`,
    );
