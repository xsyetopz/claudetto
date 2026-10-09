// Tests of the three-column grid, the context breakdown, and the Fable window of the status line (design D33).

import { expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { CONTEXT_BLOCK_MARGIN as CONTEXT_MARGIN } from "../../plugins/dotclaude/features/context/limits.mjs";
import {
  parseFable,
  readUsage,
} from "../../plugins/dotclaude/features/statusline/credits.mjs";
import { fitRows } from "../../plugins/dotclaude/features/statusline/layout.mjs";
import {
  CONTEXT_BLOCK_MARGIN,
  FABLE_MAX_AGE_MS,
} from "../../plugins/dotclaude/features/statusline/limits.mjs";
import { width } from "../../plugins/dotclaude/features/statusline/paint.mjs";
import { placeGroup } from "../../plugins/dotclaude/features/statusline/place.mjs";
import { render } from "../../plugins/dotclaude/features/statusline/render.mjs";
import { usageGroups } from "../../plugins/dotclaude/features/statusline/segments.mjs";

const NOW = Date.parse("2026-10-09T12:00:00Z");
const sec = NOW / 1000;
const data = {
  model: { id: "claude-opus-5-5" },
  effort: { level: "high" },
  context_window: {
    total_input_tokens: 84_000,
    context_window_size: 1_000_000,
  },
  workspace: { current_dir: "/work/app", project_dir: "/work/app" },
  rate_limits: {
    five_hour: { used_percentage: 23, resets_at: sec + 3600 },
    seven_day: { used_percentage: 40, resets_at: sec + 3 * 86_400 },
  },
};
const git = { branch: "main", dirty: 0, ahead: 0, behind: 0 };
const spec = { id: "dotclaude-0-28-0", done: 3, total: 10 };
const fable = { percent: 12, resetsAt: sec + 2 * 86_400 };
const plain = (d, ctx) =>
  Bun.stripANSI(render(d, { now: NOW, columns: 200, git, spec, ...ctx }));

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "dc-grid-"));
/** The fixed parts of a `/context` table, in tokens. */
const table = { system: 7700, memory: 1600, skills: 1886 };

test("wide terminal: 3 rows, with the model, the context, and the 5-hour window starting row 1", () => {
  const rows = plain(data, { fable, table }).split("\n");
  expect(rows).toHaveLength(3);
  const [model, ctx, window] = ["◆ Opus 5.5", "◧", "5h"].map((t) =>
    rows[0].indexOf(t),
  );
  expect(model).toBe(0);
  expect(ctx).toBeGreaterThan(model);
  expect(window).toBeGreaterThan(ctx);
  // The columns line up: row 2 and row 3 start the middle and the right cell at the same offsets.
  expect(rows[1].indexOf("⊛")).toBe(ctx);
  expect(rows[1].indexOf("7d")).toBe(window);
  expect(rows[2].indexOf("✦")).toBe(ctx);
  expect(rows[2].indexOf("✧")).toBe(window);
  expect(rows[1]).toContain("▤ dotclaude-0-28-0");
  expect(rows[2]).toStartWith("✓ 3/10 · ⎇ main");
});

test("the other segments fill a cell only while the columns fit, and the lowest priority goes first", () => {
  const more = {
    ...data,
    cost: { total_cost_usd: 6, total_duration_ms: 7_200_000 },
    pr: { number: 12 },
  };
  const wide = plain(more, { fable, table, columns: 300 });
  expect(wide).toContain("$6.00");
  expect(wide).toContain("#12");
  const at = (columns) => plain(more, { fable, table, columns });
  // Shrink the width: `cost` (priority 3) goes before `pr` (priority 4), and the base cells stay.
  let columns = 300;
  while (at(columns).includes("$6.00")) columns -= 1;
  expect(at(columns)).toContain("#12");
  while (at(columns).includes("#12")) columns -= 1;
  expect(at(columns)).toContain("5h");
  expect(at(columns).split("\n")).toHaveLength(3);
});

test("narrow terminal: the row packing, and no row wider than the columns", () => {
  const input = { ...data, cost: { total_cost_usd: 6 }, pr: { number: 12 } };
  const ctx = { now: NOW, columns: 70, git, spec, fable, table };
  const out = render(input, ctx);
  const expected = fitRows(
    [...usageGroups(input, ctx), placeGroup(input, ctx)],
    70,
  ).join("\n");
  expect(out).toBe(expected);
  for (const row of out.split("\n")) expect(width(row)).toBeLessThanOrEqual(70);
});

test("an empty cell stays blank, and a column with no cells is left out", () => {
  const noRight = { ...data, rate_limits: undefined };
  const rows = plain(noRight, { spec: null, git: null }).split("\n");
  // The left and middle columns remain, and nothing of the right column shows.
  expect(rows.join("\n")).not.toMatch(/5h|7d|✧/);
  expect(rows[0]).toStartWith("◆ Opus 5.5");
  expect(rows[1].trim()).toStartWith("▣ app");
});

test("no table: the middle column shows the meter and the free tokens only", () => {
  const out = plain(data, { table: null });
  expect(out).toContain("◧");
  expect(out).toContain("◇ 193k");
  expect(out).not.toMatch(/[⊛☰✦❝]/);
});

test("the copy of the block margin equals the one of the context feature", () => {
  expect(CONTEXT_BLOCK_MARGIN).toBe(CONTEXT_MARGIN);
});

const ROW = {
  kind: "weekly_scoped",
  percent: 12,
  resets_at: "2026-10-12T04:00:00+00:00",
  scope: { model: { id: null, display_name: "Fable" } },
};
const ALL = { kind: "weekly_all", percent: 47, scope: null };

test("fable: only the weekly_scoped row of Fable gives the window", () => {
  expect(parseFable([ALL, ROW])).toEqual({
    percent: 12,
    resetsAt: Date.parse(ROW.resets_at) / 1000,
  });
  const other = { ...ROW, scope: { model: { display_name: "Opus" } } };
  expect(parseFable([ALL, other])).toBeNull();
  expect(parseFable([{ ...ROW, kind: "weekly_all" }])).toBeNull();
  expect(parseFable(undefined)).toBeNull();
  expect(parseFable([{ ...ROW, resets_at: "x" }]).resetsAt).toBeNull();
});

test("fable: the window shows with its reset for a cache of 10 minutes, and is hidden at 2 hours", () => {
  const dirs = [];
  const env = (fetchedAtMs, limits) => {
    const dir = tmp();
    dirs.push(dir);
    fs.writeFileSync(
      path.join(dir, ".claude.json"),
      JSON.stringify({
        cachedUsageUtilization: { fetchedAtMs, utilization: { limits } },
      }),
    );
    return { CLAUDE_CONFIG_DIR: dir };
  };
  try {
    const young = readUsage(env(NOW - 600_000, [ALL, ROW]), NOW).fable;
    expect(young.percent).toBe(12);
    const shown = plain(data, { fable: young });
    expect(shown).toMatch(/✧ █?░* +12% ↻Oct 12 at \d{1,2}(:\d\d)?[ap]m/);
    const old = readUsage(env(NOW - 2 * FABLE_MAX_AGE_MS, [ALL, ROW]), NOW);
    expect(old.fable).toBeNull();
    expect(plain(data, { fable: old.fable })).not.toContain("✧");
    expect(readUsage(env(NOW, [ALL]), NOW).fable).toBeNull();
  } finally {
    for (const dir of dirs) fs.rmSync(dir, { recursive: true, force: true });
  }
});
