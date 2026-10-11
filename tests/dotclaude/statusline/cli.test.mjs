// Runs of `features/statusline/cli.mjs` with status JSON on stdin, as Claude Code runs it with `node`.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { stripVTControlCharacters } from "node:util";
import {
  CONTEXT_WINDOW,
  USAGE_LEVELS,
} from "../../../plugins/dotclaude/lib/budget.mjs";
import { PLUGINS, tmpDir } from "../../support/repo.mjs";

const SCRIPT = path.join(PLUGINS, "dotclaude/features/statusline/cli.mjs");
const EMPTY = tmpDir("dc-status");

/** The status line for `input`, a status object or raw text, with the colors kept. */
function raw(input, env = {}) {
  const r = spawnSync(process.execPath, [SCRIPT], {
    encoding: "utf8",
    input: typeof input === "string" ? input : JSON.stringify(input),
    cwd: EMPTY,
    // The folder `EMPTY` holds the temporary files, the config dir, and the project.
    env: {
      ...process.env,
      NO_COLOR: "",
      COLUMNS: "120",
      CLAUDE_CONFIG_DIR: EMPTY,
      TMPDIR: EMPTY,
      // The run reads no file of the real home folder.
      HOME: EMPTY,
      ...env,
    },
  });
  return r.stdout.replace(/\n$/, "");
}
/** The same, with the colors and links removed. */
const line = (input, env) => stripVTControlCharacters(raw(input, env));
const status = (tokens, extra = {}) => ({
  model: { display_name: "Opus 5.5" },
  context_window: {
    total_input_tokens: tokens,
    context_window_size: 1_000_000,
  },
  workspace: { project_dir: EMPTY },
  ...extra,
});
const at = (pct) => Math.round((CONTEXT_WINDOW * pct) / 100);

test("the context segment counts against the dotclaude window, not the model window", () => {
  assert.ok(
    line(status(at(10))).includes(
      `${Math.round(at(10) / 1000)}k/${CONTEXT_WINDOW / 1000}k 10%`,
    ),
    line(status(at(10))),
  );
  const small = line(
    status(1000, {
      context_window: {
        total_input_tokens: 1000,
        context_window_size: 200_000,
      },
    }),
  );
  assert.ok(small.includes("1k/200k 1%"), small);
});

test("the context segment is green, yellow, and red at the usage levels", () => {
  assert.ok(
    !raw(status(at(USAGE_LEVELS[0] - 1))).includes("\x1b[33m"),
    raw(status(at(USAGE_LEVELS[0] - 1))),
  );
  assert.ok(
    !raw(status(at(USAGE_LEVELS[0] - 1))).includes("\x1b[31m"),
    raw(status(at(USAGE_LEVELS[0] - 1))),
  );
  assert.ok(
    raw(status(at(USAGE_LEVELS[0]))).includes("\x1b[33m"),
    raw(status(at(USAGE_LEVELS[0]))),
  );
  assert.ok(raw(status(at(91))).includes("\x1b[31m"), raw(status(at(91))));
});

test("the context segment shows the headroom to the window", () => {
  assert.ok(
    line(status(at(40))).includes(`${CONTEXT_WINDOW / 1000 - 120}k`),
    line(status(at(40))),
  );
});

test("the line shows the effort and the 5-hour limit, and starts with the model", () => {
  const out = line(
    status(0, {
      model: { id: "claude-opus-5-5" },
      effort: { level: "high" },
      rate_limits: { five_hour: { used_percentage: 91.4 } },
    }),
  );
  assert.ok(out.startsWith("◆ Opus 5.5 high"), out);
  assert.ok(out.includes("5h"), out);
  assert.ok(out.includes("91%"), out);
  assert.ok(
    raw(
      status(0, { rate_limits: { five_hour: { used_percentage: 91.4 } } }),
    ).includes("\x1b[31m 91%"),
  );
});

test("the line shows the newest OpenSpec change and its task count, and skips the archive", () => {
  const dir = tmpDir("dc-status");
  const write = (id, text, mtime) => {
    const file = path.join(dir, "openspec/changes", id, "tasks.md");
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, text);
    fs.utimesSync(file, mtime, mtime);
  };
  write("old-change", "- [ ] a\n", 1);
  write("add-login", "## 1\n- [x] a\n- [X] b\n  - [ ] c\n* [ ] d\n- [] e\n", 2);
  write("archive", "- [x] a\n", 3);
  fs.mkdirSync(path.join(dir, "openspec/changes/no-tasks"));
  const out = line(status(0, { workspace: { project_dir: dir } }));
  assert.ok(out.includes("▤ add-login"), out);
  assert.ok(out.includes("✓ 2/4"), out);
  assert.ok(!out.includes("old-change"), out);
  fs.rmSync(dir, { recursive: true });
});

test("text that is not JSON prints an empty line and exits with `0`, and JSON `null` prints the context segment", () => {
  assert.equal(line("not json"), "");
  assert.ok(
    line("null").includes(`0k/${CONTEXT_WINDOW / 1000}k 0%`),
    line("null"),
  );
});

test("the status line writes no file in the temporary, config, project, plugin data, or home folder", () => {
  // One folder for each place that a write could go to, so a write to any of them shows.
  const folders = Object.fromEntries(
    ["tmp", "config", "project", "data", "home"].map((name) => [
      name,
      tmpDir(`dc-nofile-${name}`),
    ]),
  );
  const transcript = path.join(folders.project, "t.jsonl");
  fs.writeFileSync(
    transcript,
    `${JSON.stringify({ type: "user", message: { content: "## Context Usage\n\n| Category | Tokens | Percentage |\n|---|---|---|\n| Skills | 1.4k | 0.5% |\n" } })}\n`,
  );
  // The run starts in `EMPTY`, so a write to the working folder shows too.
  const watched = { ...folders, cwd: EMPTY };
  const listing = () =>
    Object.fromEntries(
      Object.entries(watched).map(([name, dir]) => [
        name,
        fs.readdirSync(dir, { recursive: true }).sort(),
      ]),
    );
  const before = listing();
  // The reset time is far ahead, so the run does not depend on the clock.
  const out = line(
    status(at(40), {
      transcript_path: transcript,
      workspace: {
        current_dir: folders.project,
        project_dir: folders.project,
      },
      rate_limits: {
        five_hour: { used_percentage: 40, resets_at: 4_102_444_800 },
      },
    }),
    {
      TMPDIR: folders.tmp,
      CLAUDE_CONFIG_DIR: folders.config,
      CLAUDE_PLUGIN_DATA: folders.data,
      HOME: folders.home,
    },
  );
  assert.ok(out.includes("5h"), out);
  assert.ok(out.includes("✦ 1k"), out);
  assert.deepEqual(listing(), before);
});
