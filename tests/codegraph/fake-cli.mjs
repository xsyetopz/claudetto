// A FAKE `codegraph` for the tests of dotclaude-codegraph. The tests never run the real CLI.
// The fake is a shell script on a `PATH` folder. It logs its arguments, and answers from files.

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { PLUGINS, tmpDir } from "../support/repo.mjs";

const PLUGIN = path.join(PLUGINS, "dotclaude-codegraph");
export const CLI = path.join(PLUGIN, "features/graph/cli.mjs");
export { PLUGIN };

// The fake is a Node script with a launcher: `sh` on POSIX, and `codegraph.cmd` on Windows,
// where npm installs the real CLI as a `.cmd` file and `PATH` finds no file without an extension.
const FAKE = `import fs from "node:fs";
import path from "node:path";
const dir = process.env.FAKE_DIR;
const [command, ...rest] = process.argv.slice(2);
fs.appendFileSync(path.join(dir, "log"), [command, ...rest].join(" ") + "\\n");
const answer = (name) => process.stdout.write(fs.readFileSync(path.join(dir, name)));
if (command === "--version") console.log("9.9.9");
else if (command === "query") {
  if (process.env.FAKE_QUERY_SLEEP)
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, Number(process.env.FAKE_QUERY_SLEEP) * 1000);
  answer("query.out");
} else if (command === "callers") answer("callers.out");
`;

/** Writes the fake `codegraph` into `bin`, with the launcher of the platform. */
function installFake(bin) {
  fs.writeFileSync(path.join(bin, "codegraph.mjs"), FAKE);
  if (process.platform === "win32")
    fs.writeFileSync(
      path.join(bin, "codegraph.cmd"),
      `@"${process.execPath}" "${path.join(bin, "codegraph.mjs")}" %*\r\n`,
    );
  else
    fs.writeFileSync(
      path.join(bin, "codegraph"),
      `#!/bin/sh\nexec "${process.execPath}" "$0.mjs" "$@"\n`,
      { mode: 0o755 },
    );
}

/** A project folder, a fake CLI folder, and the answers of the fake. `index` makes `.codegraph/codegraph.db`. */
export function setUp({ index = true, installed = true } = {}) {
  const dir = tmpDir("codegraph");
  const project = path.join(dir, "project");
  const bin = path.join(dir, "bin");
  fs.mkdirSync(project);
  fs.mkdirSync(bin);
  if (index) {
    fs.mkdirSync(path.join(project, ".codegraph"));
    fs.writeFileSync(path.join(project, ".codegraph", "codegraph.db"), "");
  }
  if (installed) installFake(bin);
  // The child process needs more than `PATH` in its environment, so the base is the test environment
  // without the variables of a parent Claude Code session.
  // On Windows the variable is `Path`, and a second key `PATH` would be a duplicate, so the base drops both.
  const base = Object.fromEntries(
    Object.entries(process.env).filter(
      ([k]) => !k.startsWith("CLAUDE_") && k.toUpperCase() !== "PATH",
    ),
  );
  // Windows needs its system folder on `PATH` for `cmd.exe`.
  const system =
    process.platform === "win32"
      ? [`${process.env.SystemRoot}\\System32`]
      : ["/usr/bin", "/bin"];
  const env = {
    ...base,
    PATH: [bin, ...system].join(path.delimiter),
    FAKE_DIR: dir,
    HOME: dir,
    USERPROFILE: dir,
  };
  const answer = (name, value) =>
    fs.writeFileSync(
      path.join(dir, name),
      typeof value === "string" ? value : JSON.stringify(value),
    );
  return {
    dir,
    project,
    env,
    answer,
    /** The lines that the fake got, one per call. */
    log: () => {
      const file = path.join(dir, "log");
      return fs.existsSync(file)
        ? fs.readFileSync(file, "utf8").trim().split(/\r?\n/)
        : [];
    },
  };
}

/** Runs `cli.mjs mode` with `payload` on stdin, and gives `{ out, status, err }`. `out` is the parsed stdout or null. */
export function runHook(mode, payload, env, script = CLI) {
  const r = spawnSync(process.execPath, [script, mode], {
    input: JSON.stringify(payload),
    // The cwd is a temp folder and not the repository, so the run does not depend on the files of the repository.
    cwd: os.tmpdir(),
    env,
    encoding: "utf8",
  });
  return {
    out: r.stdout ? JSON.parse(r.stdout) : null,
    status: r.status,
    err: r.stderr,
  };
}

/** A node as `codegraph query --json` gives it, with the fields that the add-on reads. */
export const hit = (name, kind, filePath, startLine, score = 1) => ({
  node: { name, kind, filePath, startLine },
  score,
});

/** A caller as `codegraph callers --json` gives it. */
export const caller = (name, filePath, startLine, kind = "function") => ({
  name,
  kind,
  filePath,
  startLine,
});
