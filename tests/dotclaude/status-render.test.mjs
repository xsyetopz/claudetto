// The segments, the look, the layout, git, and the subagent rows of the status line.

import { expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  gitState,
  parseStatus,
} from "../../plugins/dotclaude/features/statusline/git.mjs";
import {
  ICON,
  width,
} from "../../plugins/dotclaude/features/statusline/paint.mjs";
import { render } from "../../plugins/dotclaude/features/statusline/render.mjs";
import { taskRows } from "../../plugins/dotclaude/features/statusline/subagents.mjs";
import { CONTEXT_WINDOW } from "../../plugins/dotclaude/lib/budget.mjs";

const FEATURE = path.join(
  import.meta.dirname,
  "../../plugins/dotclaude/features/statusline",
);
const NOW = Date.parse("2026-10-04T12:00:00Z");
const sec = NOW / 1000;
const plain = (data, ctx = {}) =>
  Bun.stripANSI(render(data, { now: NOW, columns: 200, ...ctx }));
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
  expect(rows.length).toBeLessThanOrEqual(3);
  expect(rows[0]).toStartWith("◆ Opus 5.5");
  const text = rows.join("\n");
  expect(text.indexOf("5h")).toBeGreaterThan(text.indexOf("50k/300k"));
  expect(text.indexOf("app")).toBeGreaterThan(text.indexOf("5h"));
  expect(text.indexOf("main")).toBeGreaterThan(text.indexOf("app"));
});

test("an absent field leaves no segment and no empty space", () => {
  const out = plain(base);
  expect(out).not.toContain("#");
  expect(out).not.toContain("  ·");
  expect(out).not.toContain("· ·");
  expect(out.split("\n").every((row) => row === row.trim())).toBe(true);
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
  expect(out).toContain("\x1b]8;;https://example.test/pr/12\x07");
  expect(Bun.stripANSI(out)).toContain("#12");
  expect(Bun.stripANSI(out)).toContain("wt");
  expect(Bun.stripANSI(out)).toContain("@rev");
  expect(Bun.stripANSI(out)).toContain("xsyetopz/dotclaude");
});

test("the deficit shows with the run-out time", () => {
  const limits = {
    five_hour: { used_percentage: 62, resets_at: sec + 2.5 * 3600 },
  };
  const out = plain({ ...base, rate_limits: limits });
  expect(out).toContain("▲12%");
  expect(out).toContain("⏵");
  const early = {
    five_hour: { used_percentage: 5, resets_at: sec + 4.95 * 3600 },
  };
  expect(plain({ ...base, rate_limits: early })).not.toMatch(/[▲▼⏵]/);
});

test("the reset credits show with the next expiry", () => {
  const out = plain(base, { credits: { left: 2, until: sec + 8 * 86_400 } });
  expect(out).toMatch(/⟳2 by Oct 1[123] at \d{1,2}(:\d\d)?[ap]m/);
  expect(plain(base, { credits: null })).not.toContain("⟳");
});

test("the context is red at 91% of the window and shows the headroom", () => {
  const tokens = Math.round(CONTEXT_WINDOW * 0.91);
  const out = render(
    { ...base, context_window: { total_input_tokens: tokens } },
    { now: NOW, columns: 200 },
  );
  expect(out).toContain("\x1b[31m");
  expect(Bun.stripANSI(out)).toContain("91%");
  expect(Bun.stripANSI(out)).toContain(
    `${Math.round((CONTEXT_WINDOW - tokens) / 1000)}k`,
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
  expect(Bun.stripANSI(at(NOW, warm))).toContain("10m");
  expect(Bun.stripANSI(at(NOW, warm))).not.toContain("◬");
  const soon = { ...base, prompt_cache: cache(true, 90) };
  // The glyph is red in the first half of a second and dim in the second half, so it blinks.
  const on = at(NOW, soon);
  const off = at(NOW + 1000, soon);
  expect(on).toContain("\x1b[31m◬");
  expect(off).not.toContain("\x1b[31m◬");
  expect(off).toContain("\x1b[2m◬");
  const cold = plain({
    ...base,
    prompt_cache: cache(false, 0, { recache_tokens_if_cold: 120_000 }),
  });
  expect(cold).toContain("cold");
  expect(cold).toContain("120k to rebuild");
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
  expect(out).toContain("hit 93%");
  expect(out).toContain("✘2 tools");
});

test("the rates show the cost and the changed lines for each hour", () => {
  const cost = {
    total_cost_usd: 6,
    total_duration_ms: 2 * 3_600_000,
    total_lines_added: 300,
    total_lines_removed: 0,
  };
  const out = plain({ ...base, cost });
  expect(out).toContain("$3.00/h");
  expect(out).toContain("150/h");
});

test("`NO_COLOR` removes the color codes and keeps the icons and the bars", () => {
  const data = {
    ...base,
    rate_limits: { five_hour: { used_percentage: 95, resets_at: sec + 3600 } },
    prompt_cache: { caching_observed: true, warm: true, expires_at: sec + 30 },
  };
  const color = render(data, { now: NOW, columns: 200 });
  expect(color).toContain("\x1b[");
  process.env.NO_COLOR = "1";
  try {
    const none = render(data, { now: NOW, columns: 200 });
    expect(Bun.stripANSI(none)).toBe(none);
    expect(none).toContain("◧");
    expect(none).toContain("█");
    expect(none).toContain("◬");
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
  expect(rows.length).toBeLessThanOrEqual(3);
  for (const row of rows) expect(width(row)).toBeLessThanOrEqual(60);
  const text = Bun.stripANSI(rows.join("\n"));
  expect(text).toContain("Opus 5.5");
  expect(text).toContain("◧");
});

test("git: the porcelain output gives branch, changes, ahead, and behind", () => {
  const text =
    "# branch.oid abcdef1234\n# branch.head main\n# branch.ab +2 -1\n1 .M N... 100644 100644 100644 a b f\n? g\n";
  expect(parseStatus(text)).toEqual({
    branch: "main",
    dirty: 2,
    ahead: 2,
    behind: 1,
  });
  expect(
    parseStatus("# branch.oid abcdef1234\n# branch.head (detached)\n").branch,
  ).toBe("abcdef1");
  expect(parseStatus("")).toBeNull();
});

/** A folder with a `git` that sleeps, put first on the `PATH`. */
function slowGit() {
  const bin = fs.mkdtempSync(path.join(os.tmpdir(), "dc-slowgit-"));
  fs.writeFileSync(path.join(bin, "git"), "#!/bin/sh\nsleep 10\n", {
    mode: 0o755,
  });
  return bin;
}

test("git: a call that does not answer in the time limit gives `null`, and the line still prints", () => {
  const bin = slowGit();
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "dc-slowtmp-"));
  const saved = process.env.PATH;
  try {
    process.env.PATH = `${bin}:${saved}`;
    const t0 = Date.now();
    expect(gitState(tmp, 100)).toBeNull();
    expect(Date.now() - t0).toBeLessThan(3000);
    const r = Bun.spawnSync(
      [Bun.which("node"), path.join(FEATURE, "cli.mjs")],
      {
        stdin: Buffer.from(
          JSON.stringify({ ...base, workspace: { current_dir: tmp } }),
        ),
        cwd: tmp,
        env: {
          ...process.env,
          PATH: `${bin}:${saved}`,
          TMPDIR: tmp,
          CLAUDE_CONFIG_DIR: tmp,
          NO_COLOR: "1",
        },
      },
    );
    expect(r.exitCode).toBe(0);
    const out = r.stdout.toString();
    expect(out).toContain("Opus 5.5");
    expect(out).not.toContain("⎇");
  } finally {
    process.env.PATH = saved;
    fs.rmSync(bin, { recursive: true });
    fs.rmSync(tmp, { recursive: true });
  }
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
  expect(rows.map((r) => r.id)).toEqual(["a1", "b2"]);
  const text = Bun.stripANSI(rows[0].content);
  for (const part of [
    "investigator",
    "(reviewer)",
    "Sonnet 5.5",
    "medium",
    "60k/300k",
    "5m",
  ])
    expect(text).toContain(part);
  const r = Bun.spawnSync(
    [Bun.which("node"), path.join(FEATURE, "subagent-cli.mjs")],
    {
      stdin: Buffer.from(
        JSON.stringify({
          columns: 120,
          tasks: [task("a1", "x"), task("b2", "y")],
        }),
      ),
    },
  );
  const lines = r.stdout
    .toString()
    .trim()
    .split("\n")
    .map((l) => JSON.parse(l));
  expect(lines.map((l) => l.id)).toEqual(["a1", "b2"]);
  expect(typeof lines[0].content).toBe("string");
  const bad = Bun.spawnSync(
    [Bun.which("node"), path.join(FEATURE, "subagent-cli.mjs")],
    { stdin: Buffer.from("nope") },
  );
  expect(bad.exitCode).toBe(0);
  expect(bad.stdout.toString()).toBe("");
});

// A glyph with the Unicode `Emoji` property can show 2 columns wide, which moves the columns of the grid.
test("no icon outside ASCII has the Unicode `Emoji` property", () => {
  const emoji = Object.entries(ICON)
    .filter(
      ([, g]) =>
        [...g].some((c) => c.codePointAt(0) > 0x7f) && /\p{Emoji}/u.test(g),
    )
    .map(([name]) => name);
  expect(emoji).toEqual([]);
});
