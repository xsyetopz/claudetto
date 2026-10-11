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

const SCRIPT = `#!/bin/sh
echo "$@" >> "$FAKE_DIR/log"
case "$1" in
  --version) echo "9.9.9" ;;
  query) [ -n "$FAKE_QUERY_SLEEP" ] && sleep "$FAKE_QUERY_SLEEP"; cat "$FAKE_DIR/query.out" ;;
  callers) cat "$FAKE_DIR/callers.out" ;;
  sync) exit 0 ;;
esac
`;

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
  if (installed) {
    fs.writeFileSync(path.join(bin, "codegraph"), SCRIPT, { mode: 0o755 });
  }
  // The child process needs more than `PATH` in its environment, so the base is the test environment
  // without the variables of a parent Claude Code session.
  const base = Object.fromEntries(
    Object.entries(process.env).filter(([k]) => !k.startsWith("CLAUDE_")),
  );
  const env = {
    ...base,
    PATH: `${bin}:/usr/bin:/bin`,
    FAKE_DIR: dir,
    HOME: dir,
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
        ? fs.readFileSync(file, "utf8").trim().split("\n")
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
