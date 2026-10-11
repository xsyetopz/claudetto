// The segments, the look, the layout, git, and the subagent rows of the status line.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { stripVTControlCharacters } from "node:util";
import {
  gitState,
  parseStatus,
} from "../../../plugins/dotclaude/features/statusline/git.mjs";
import {
  ICON,
  width,
} from "../../../plugins/dotclaude/features/statusline/paint.mjs";
import { render } from "../../../plugins/dotclaude/features/statusline/render.mjs";
import { taskRows } from "../../../plugins/dotclaude/features/statusline/subagents.mjs";
import { CONTEXT_WINDOW } from "../../../plugins/dotclaude/lib/budget.mjs";
import { PLUGINS, tmpDir } from "../../support/repo.mjs";

const FEATURE = path.join(PLUGINS, "dotclaude/features/statusline");
const NOW = Date.parse("2026-10-04T12:00:00Z");
const sec = NOW / 1000;
const plain = (data, ctx = {}) =>
  stripVTControlCharacters(render(data, { now: NOW, columns: 200, ...ctx }));
const base = {
  model: { id: "claude-opus-5-5" },
  context_window: {
    total_input_tokens: 50_000,
    context_window_size: 1_000_000,
  },
  workspace: { current_dir: "/work/app", project_dir: "/work/app" },
};

test("row order: the model first, the usage next, and the place after the usage", () => {
  const rows = plain(
    {
      ...base,
      rate_limits: {
        five_hour: { used_percentage: 10, resets_at: sec + 3600 },
      },
    },
    { git: { branch: "main", dirty: 0, ahead: 0, behind: 0 } },
  ).split("\n");
  assert.ok(rows.length <= 3, `${rows.length}`);
  assert.ok(rows[0].startsWith("◆ Opus 5.5"), rows[0]);
  const text = rows.join("\n");
  assert.ok(
    text.indexOf("5h") > text.indexOf("50k/300k"),
    `${text.indexOf("5h")}`,
  );
  assert.ok(text.indexOf("app") > text.indexOf("5h"), `${text.indexOf("app")}`);
  assert.ok(
    text.indexOf("main") > text.indexOf("app"),
    `${text.indexOf("main")}`,
  );
});

test("an absent field leaves no segment and no empty space", () => {
  const out = plain(base);
  assert.ok(!out.includes("#"), out);
  assert.ok(!out.includes("  ·"), out);
  assert.ok(!out.includes("· ·"), out);
  assert.equal(
    out.split("\n").every((row) => row === row.trim()),
    true,
  );
});

test("the pull request shows as a link, and the place segments show the worktree and the agent", () => {
  const pr = {
    number: 12,
    url: "https://example.test/pr/12",
    review_state: "approved",
  };
  const out = render(
    {
      ...base,
      pr,
      worktree: { name: "wt" },
      agent: { name: "rev" },
      workspace: {
        ...base.workspace,
        repo: { host: "github.com", owner: "xsyetopz", name: "dotclaude" },
      },
    },
    { now: NOW, columns: 200 },
  );
  assert.ok(out.includes("\x1b]8;;https://example.test/pr/12\x07"), out);
  assert.ok(
    stripVTControlCharacters(out).includes("#12"),
    stripVTControlCharacters(out),
  );
  assert.ok(
    stripVTControlCharacters(out).includes("wt"),
    stripVTControlCharacters(out),
  );
  assert.ok(
    stripVTControlCharacters(out).includes("@rev"),
    stripVTControlCharacters(out),
  );
  assert.ok(
    stripVTControlCharacters(out).includes("xsyetopz/dotclaude"),
    stripVTControlCharacters(out),
  );
});

test("the deficit shows with the run-out time", () => {
  const limits = {
    five_hour: { used_percentage: 62, resets_at: sec + 2.5 * 3600 },
  };
  const out = plain({ ...base, rate_limits: limits });
  assert.ok(out.includes("▲12%"), out);
  assert.ok(out.includes("⏵"), out);
  const early = {
    five_hour: { used_percentage: 5, resets_at: sec + 4.95 * 3600 },
  };
  assert.doesNotMatch(plain({ ...base, rate_limits: early }), /[▲▼⏵]/);
});

test("the reset credits show with the next expiry", () => {
  const out = plain(base, { credits: { left: 2, until: sec + 8 * 86_400 } });
  assert.match(out, /⟳2 by Oct 1[123] at \d{1,2}(:\d\d)?[ap]m/);
  assert.ok(
    !plain(base, { credits: null }).includes("⟳"),
    plain(base, { credits: null }),
  );
});

test("the context is red at 91% of the window and shows the headroom", () => {
  const tokens = Math.round(CONTEXT_WINDOW * 0.91);
  const out = render(
    { ...base, context_window: { total_input_tokens: tokens } },
    { now: NOW, columns: 200 },
  );
  assert.ok(out.includes("\x1b[31m"), out);
  assert.ok(
    stripVTControlCharacters(out).includes("91%"),
    stripVTControlCharacters(out),
  );
  assert.ok(
    stripVTControlCharacters(out).includes(
      `${Math.round((CONTEXT_WINDOW - tokens) / 1000)}k`,
    ),
    stripVTControlCharacters(out),
  );
});

test("the cache segment shows the time left, a blinking alarm under 2 minutes, and the cold state", () => {
  const cache = (warm, left, extra = {}) => ({
    caching_observed: true,
    warm,
    expires_at: sec + left,
    ...extra,
  });
  const at = (now, data) => render(data, { now, columns: 200 });
  const warm = { ...base, prompt_cache: cache(true, 600) };
  assert.ok(
    stripVTControlCharacters(at(NOW, warm)).includes("10m"),
    stripVTControlCharacters(at(NOW, warm)),
  );
  assert.ok(
    !stripVTControlCharacters(at(NOW, warm)).includes("◬"),
    stripVTControlCharacters(at(NOW, warm)),
  );
  const soon = { ...base, prompt_cache: cache(true, 90) };
  // The glyph is red in the first half of a second and dim in the second half, so it blinks.
  const on = at(NOW, soon);
  const off = at(NOW + 1000, soon);
  assert.ok(on.includes("\x1b[31m◬"), on);
  assert.ok(!off.includes("\x1b[31m◬"), off);
  assert.ok(off.includes("\x1b[2m◬"), off);
  const cold = plain({
    ...base,
    prompt_cache: cache(false, 0, { recache_tokens_if_cold: 120_000 }),
  });
  assert.ok(cold.includes("cold"), cold);
  assert.ok(cold.includes("120k to rebuild"), cold);
});

test("the cache segment shows the hit ratio and the misses with the last cause", () => {
  const out = plain({
    ...base,
    prompt_cache: {
      caching_observed: true,
      warm: true,
      expires_at: sec + 600,
      hit_ratio: 0.93,
      misses: 2,
      miss_causes: { tools_changed: 2 },
      last_miss_cause: { causes: ["tools_changed"] },
    },
  });
  assert.ok(out.includes("hit 93%"), out);
  assert.ok(out.includes("✘2 tools"), out);
});

test("the rates show the cost and the changed lines for each hour", () => {
  const cost = {
    total_cost_usd: 6,
    total_duration_ms: 2 * 3_600_000,
    total_lines_added: 300,
    total_lines_removed: 0,
  };
  const out = plain({ ...base, cost });
  assert.ok(out.includes("$3.00/h"), out);
  assert.ok(out.includes("150/h"), out);
});

test("`NO_COLOR` removes the color codes and keeps the icons and the bars", () => {
  const data = {
    ...base,
    rate_limits: { five_hour: { used_percentage: 95, resets_at: sec + 3600 } },
    prompt_cache: { caching_observed: true, warm: true, expires_at: sec + 30 },
  };
  const color = render(data, { now: NOW, columns: 200 });
  assert.ok(color.includes("\x1b["), color);
  process.env.NO_COLOR = "1";
  try {
    const none = render(data, { now: NOW, columns: 200 });
    assert.equal(stripVTControlCharacters(none), none);
    assert.ok(none.includes("◧"), none);
    assert.ok(none.includes("█"), none);
    assert.ok(none.includes("◬"), none);
  } finally {
    delete process.env.NO_COLOR;
  }
});

test("at 60 columns no row is wider than 60, and the model and context stay", () => {
  const data = {
    ...base,
    effort: { level: "high" },
    rate_limits: {
      five_hour: { used_percentage: 62, resets_at: sec + 2.5 * 3600 },
      seven_day: { used_percentage: 30, resets_at: sec + 3 * 86_400 },
    },
    prompt_cache: {
      caching_observed: true,
      warm: true,
      expires_at: sec + 600,
      hit_ratio: 0.9,
    },
    cost: {
      total_cost_usd: 6,
      total_duration_ms: 7_200_000,
      total_lines_added: 300,
    },
    pr: { number: 12 },
    agent: { name: "reviewer" },
    vim: { mode: "NORMAL" },
    output_style: { name: "dotclaude" },
    session_name: "a long session name for the narrow test",
  };
  const ctx = {
    git: { branch: "main", dirty: 3, ahead: 1, behind: 0 },
    spec: { id: "change", done: 3, total: 10 },
    credits: { left: 2, until: null },
  };
  const rows = render(data, { now: NOW, columns: 60, ...ctx }).split("\n");
  assert.ok(rows.length <= 3, `${rows.length}`);
  for (const row of rows) assert.ok(width(row) <= 60, `${width(row)}`);
  const text = stripVTControlCharacters(rows.join("\n"));
  assert.ok(text.includes("Opus 5.5"), text);
  assert.ok(text.includes("◧"), text);
});

test("git: the porcelain output gives branch, changes, ahead, and behind", () => {
  const text =
    "# branch.oid abcdef1234\n# branch.head main\n# branch.ab +2 -1\n1 .M N... 100644 100644 100644 a b f\n? g\n";
  assert.deepEqual(parseStatus(text), {
    branch: "main",
    dirty: 2,
    ahead: 2,
    behind: 1,
  });
  assert.equal(
    parseStatus("# branch.oid abcdef1234\n# branch.head (detached)\n").branch,
    "abcdef1",
  );
  assert.equal(parseStatus(""), null);
});

/** A `git` call that was stopped at its time limit, as `spawnSync` reports it. */
const TIMED_OUT = {
  status: null,
  stdout: "",
  error: Object.assign(new Error("spawnSync git ETIMEDOUT"), {
    code: "ETIMEDOUT",
  }),
};

test("git: a call that does not answer in the time limit gives `null`", () => {
  const calls = [];
  const run = (...args) => {
    calls.push(args);
    return TIMED_OUT;
  };
  assert.equal(gitState("/work/app", 100, run), null);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][2].timeout, 100);
});

test("git: a call that answers gives the state of the folder", () => {
  const run = () => ({
    status: 0,
    stdout: "# branch.oid abcdef1234\n# branch.head main\n# branch.ab +0 -0\n",
  });
  assert.deepEqual(gitState("/work/app", 100, run), {
    branch: "main",
    dirty: 0,
    ahead: 0,
    behind: 0,
  });
});

test("git: a `git` that does not answer leaves the line printed with no branch", () => {
  // The fake `git` is on the `PATH` of the child only. `exec` makes the time limit stop `sleep` itself.
  const bin = tmpDir("dc-slowgit");
  const tmp = tmpDir("dc-slowtmp");
  fs.writeFileSync(path.join(bin, "git"), "#!/bin/sh\nexec sleep 10\n", {
    mode: 0o755,
  });
  const r = spawnSync(process.execPath, [path.join(FEATURE, "cli.mjs")], {
    encoding: "utf8",
    input: JSON.stringify({ ...base, workspace: { current_dir: tmp } }),
    cwd: tmp,
    env: {
      ...process.env,
      PATH: `${bin}:${process.env.PATH}`,
      TMPDIR: tmp,
      CLAUDE_CONFIG_DIR: tmp,
      NO_COLOR: "1",
    },
  });
  assert.equal(r.status, 0);
  assert.ok(r.stdout.includes("Opus 5.5"), r.stdout);
  assert.ok(!r.stdout.includes(ICON.branch), r.stdout);
});

test("the subagent status line gives one JSON row for each running subagent", () => {
  const task = (id, name) => ({
    id,
    name,
    model: "claude-sonnet-5-5",
    effort: "medium",
    agentType: "dotclaude:reviewer",
    status: "running",
    contextWindowSize: 1_000_000,
    tokenCount: 60_000,
    startTime: NOW - 5 * 60_000,
    description: "reads files",
  });
  const rows = taskRows(
    {
      columns: 120,
      tasks: [
        task("a1", "investigator"),
        task("b2", "debugger"),
        { name: "no id" },
        { ...task("c3", "done"), status: "completed" },
      ],
    },
    NOW,
  );
  assert.deepEqual(
    rows.map((r) => r.id),
    ["a1", "b2"],
  );
  const text = stripVTControlCharacters(rows[0].content);
  for (const part of [
    "investigator",
    "(reviewer)",
    "Sonnet 5.5",
    "medium",
    "60k/300k",
    "5m",
  ])
    assert.ok(text.includes(part), text);
  const r = spawnSync(
    process.execPath,
    [path.join(FEATURE, "subagent-cli.mjs")],
    {
      encoding: "utf8",
      input: JSON.stringify({
        columns: 120,
        tasks: [task("a1", "x"), task("b2", "y")],
      }),
    },
  );
  const lines = r.stdout
    .trim()
    .split("\n")
    .map((l) => JSON.parse(l));
  assert.deepEqual(
    lines.map((l) => l.id),
    ["a1", "b2"],
  );
  assert.equal(typeof lines[0].content, "string");
  const bad = spawnSync(
    process.execPath,
    [path.join(FEATURE, "subagent-cli.mjs")],
    { encoding: "utf8", input: "nope" },
  );
  assert.equal(bad.status, 0);
  assert.equal(bad.stdout, "");
});

// A glyph with the Unicode `Emoji` property can show 2 columns wide, which moves the columns of the grid.
test("no icon outside ASCII has the Unicode `Emoji` property", () => {
  const emoji = Object.entries(ICON)
    .filter(
      ([, g]) =>
        [...g].some((c) => c.codePointAt(0) > 0x7f) && /\p{Emoji}/u.test(g),
    )
    .map(([name]) => name);
  assert.deepEqual(emoji, []);
});
