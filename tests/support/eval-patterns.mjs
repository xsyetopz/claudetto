// The regex source of the file-state graders in `plugins/dotclaude/evals/*/case.yaml`.
// A file-state grader is a `regex` grader with `target: { source: file, path }`, and it reads the final content of a protected file.
// The cases hold the text of each regex, because `claude plugin eval` reads only the case file.
// `tests/dotclaude/eval-graders.test.mjs` checks each case regex against these builders and against the content that the scaffold writes.

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/** The start and the end of the whole content. Unlike `^` and `$`, they hold with or without the `m` flag. */
const START = String.raw`(?<![\s\S])`;
const END = String.raw`(?![\s\S])`;

/** `text` as a regex source that matches only that text, with a line end as `\n`. */
export function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replaceAll("\n", "\\n");
}

/** The regex source of the exact content `content`, with an optional last line end. */
export function exactContentPattern(content) {
  return `${START}${escapeRegex(content.replace(/\n$/, ""))}\\n?${END}`;
}

/** The regex source of a large file: the first line, the key line, and the last line, with any text between them. */
export function boundedContentPattern(content) {
  const lines = content.replace(/\n$/, "").split("\n");
  const key = lines.find((l) => l.includes("audit code is"));
  const [first, last] = [lines[0], lines.at(-1)];
  const gap = String.raw`\n[\s\S]*\n`;
  return `${START}${escapeRegex(first)}${gap}${escapeRegex(key)}${gap}${escapeRegex(last)}\\n?${END}`;
}

const scaffolds = new Map();

/**
 * Runs the `scaffold.sh` of `caseDir` in a fresh folder under `os.tmpdir()` and returns the folder.
 * The run happens once for each `caseDir` in a process, because a bash start costs most of the time on Windows,
 * and the tests only read the folder.
 * A test must not change or remove it. `tmp-root.mjs` removes it at exit.
 */
export function runScaffold(caseDir) {
  if (scaffolds.has(caseDir)) return scaffolds.get(caseDir);
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "eval-scaffold-"));
  execFileSync("bash", [path.join(caseDir, "scaffold.sh")], {
    cwd,
    env: {
      PATH: process.env.PATH,
      HOME: cwd,
      // Bash on Windows cannot start without the Windows folder.
      ...(process.env.SYSTEMROOT && { SYSTEMROOT: process.env.SYSTEMROOT }),
      GIT_CONFIG_GLOBAL: "/dev/null",
      GIT_CONFIG_NOSYSTEM: "1",
    },
    stdio: "pipe",
  });
  scaffolds.set(caseDir, cwd);
  return cwd;
}
