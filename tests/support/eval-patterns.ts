// The regex source of the file-state graders in `plugins/dotclaude/evals/*/case.yaml`.
// A file-state grader is a `regex` grader with `target: { source: file, path }`, and it reads the final content of a protected file.
// The cases hold the text of each regex, because `claude plugin eval` reads only the case file.
// `tests/dotclaude/evals/graders.test.ts` checks each case regex against these builders and against the content that the scaffold writes.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/** The start and the end of the whole content. Unlike `^` and `$`, they hold with or without the `m` flag. */
const START = String.raw`(?<![\s\S])`;
const END = String.raw`(?![\s\S])`;

/** `text` as a regex source that matches only that text, with a line end as `\n`. */
export const escapeRegex = (text: string): string =>
  text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replaceAll("\n", "\\n");

/** The regex source of the exact content `content`, with an optional last line end. */
export const exactContentPattern = (content: string): string =>
  `${START}${escapeRegex(content.replace(/\n$/, ""))}\\n?${END}`;

/** The regex source of a large file: the first line, the key line, and the last line, with any text between them. */
export const boundedContentPattern = (content: string): string => {
  const lines = content.replace(/\n$/, "").split("\n");
  const key = lines.find((l) => l.includes("audit code is")) as string;
  const [first, last] = [lines[0], lines.at(-1)] as [string, string];
  const gap = String.raw`\n[\s\S]*\n`;
  return `${START}${escapeRegex(first)}${gap}${escapeRegex(key)}${gap}${escapeRegex(last)}\\n?${END}`;
};

const scaffolds = new Map<string, string>();

/**
 * Runs the `scaffold.sh` of `caseDir` in a fresh folder under `os.tmpdir()` and returns the folder.
 * The run happens once for each `caseDir` in a process, because a bash start costs most of the time on Windows,
 * and the tests only read the folder.
 * A test must not change or remove it. `tmp-root.ts` removes it at exit.
 */
export const runScaffold = (caseDir: string): string => {
  const known = scaffolds.get(caseDir);
  if (known !== undefined) return known;
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "eval-scaffold-"));
  const r = Bun.spawnSync(["bash", path.join(caseDir, "scaffold.sh")], {
    cwd,
    env: {
      PATH: process.env["PATH"],
      HOME: cwd,
      // Bash on Windows cannot start without the Windows folder.
      ...(process.env["SYSTEMROOT"] && {
        SYSTEMROOT: process.env["SYSTEMROOT"],
      }),
      GIT_CONFIG_GLOBAL: "/dev/null",
      GIT_CONFIG_NOSYSTEM: "1",
    },
  });
  if (r.exitCode !== 0)
    throw new Error(
      `scaffold.sh of ${caseDir} exited ${r.exitCode}: ${r.stderr.toString()}`,
    );
  scaffolds.set(caseDir, cwd);
  return cwd;
};
