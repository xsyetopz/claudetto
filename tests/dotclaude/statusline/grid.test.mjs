// Tests of the three-column grid, the context breakdown, and the Fable window of the status line (design D33).

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { stripVTControlCharacters } from "node:util";
import {
  parseFable,
  readUsage,
} from "../../../plugins/dotclaude/features/statusline/credits.mjs";
import { fitRows } from "../../../plugins/dotclaude/features/statusline/layout.mjs";
import { FABLE_MAX_AGE_MS } from "../../../plugins/dotclaude/features/statusline/limits.mjs";
import { width } from "../../../plugins/dotclaude/features/statusline/paint.mjs";
import { placeGroup } from "../../../plugins/dotclaude/features/statusline/place.mjs";
import { render } from "../../../plugins/dotclaude/features/statusline/render.mjs";
import { usageGroups } from "../../../plugins/dotclaude/features/statusline/segments.mjs";
import { tmpDir } from "../../support/repo.mjs";

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
  stripVTControlCharacters(
    render(d, { now: NOW, columns: 200, git, spec, ...ctx }),
  );

const tmp = () => tmpDir("dc-grid");
/** The fixed parts of a `/context` table, in tokens. */
const table = { system: 7700, memory: 1600, skills: 1886 };

test("wide terminal: 3 rows, with the model, the context, and the 5-hour window starting row 1", () => {
  const rows = plain(data, { fable, table }).split("\n");
  assert.equal(rows.length, 3);
  const [model, ctx, window] = ["◆ Opus 5.5", "◧", "5h"].map((t) =>
    rows[0].indexOf(t),
  );
  assert.equal(model, 0);
  assert.ok(ctx > model, `${ctx}`);
  assert.ok(window > ctx, `${window}`);
  // The columns line up: row 2 and row 3 start the middle and the right cell at the same offsets.
  assert.equal(rows[1].indexOf("⊛"), ctx);
  assert.equal(rows[1].indexOf("7d"), window);
  assert.equal(rows[2].indexOf("✦"), ctx);
  assert.equal(rows[2].indexOf("✧"), window);
  assert.ok(rows[1].includes("▤ dotclaude-0-28-0"), rows[1]);
  assert.ok(rows[2].startsWith("✓ 3/10 · ⎇ main"), rows[2]);
});

test("the other segments fill a cell only while the columns fit, and the lowest priority goes first", () => {
  const more = {
    ...data,
    cost: { total_cost_usd: 6, total_duration_ms: 7_200_000 },
    pr: { number: 12 },
  };
  const wide = plain(more, { fable, table, columns: 300 });
  assert.ok(wide.includes("$6.00"), wide);
  assert.ok(wide.includes("#12"), wide);
  const at = (columns) => plain(more, { fable, table, columns });
  // Shrink the width: `cost` (priority 3) goes before `pr` (priority 4), and the base cells stay.
  let columns = 300;
  while (at(columns).includes("$6.00")) columns -= 1;
  assert.ok(at(columns).includes("#12"), at(columns));
  while (at(columns).includes("#12")) columns -= 1;
  assert.ok(at(columns).includes("5h"), at(columns));
  assert.equal(at(columns).split("\n").length, 3);
});

test("narrow terminal: the row packing, and no row wider than the columns", () => {
  const input = { ...data, cost: { total_cost_usd: 6 }, pr: { number: 12 } };
  const ctx = { now: NOW, columns: 70, git, spec, fable, table };
  const out = render(input, ctx);
  const expected = fitRows(
    [...usageGroups(input, ctx), placeGroup(input, ctx)],
    70,
  ).join("\n");
  assert.equal(out, expected);
  for (const row of out.split("\n"))
    assert.ok(width(row) <= 70, `${width(row)}`);
});

test("an empty cell stays blank, and a column with no cells is left out", () => {
  const noRight = { ...data, rate_limits: undefined };
  const rows = plain(noRight, { spec: null, git: null }).split("\n");
  // The left and middle columns remain, and nothing of the right column shows.
  assert.doesNotMatch(rows.join("\n"), /5h|7d|✧/);
  assert.ok(rows[0].startsWith("◆ Opus 5.5"), rows[0]);
  assert.ok(rows[1].trim().startsWith("▣ app"), rows[1].trim());
});

test("no table: the middle column shows the meter and the free tokens only", () => {
  const out = plain(data, { table: null });
  assert.ok(out.includes("◧"), out);
  assert.ok(out.includes("◇ 193k"), out);
  assert.doesNotMatch(out, /[⊛☰✦❝]/);
});

const ROW = {
  kind: "weekly_scoped",
  percent: 12,
  resets_at: "2026-10-12T04:00:00+00:00",
  scope: { model: { id: null, display_name: "Fable" } },
};
const ALL = { kind: "weekly_all", percent: 47, scope: null };

test("fable: only the weekly_scoped row of Fable gives the window", () => {
  assert.deepEqual(parseFable([ALL, ROW]), {
    percent: 12,
    resetsAt: Date.parse(ROW.resets_at) / 1000,
  });
  const other = { ...ROW, scope: { model: { display_name: "Opus" } } };
  assert.equal(parseFable([ALL, other]), null);
  assert.equal(parseFable([{ ...ROW, kind: "weekly_all" }]), null);
  assert.equal(parseFable(undefined), null);
  assert.equal(parseFable([{ ...ROW, resets_at: "x" }]).resetsAt, null);
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
    assert.equal(young.percent, 12);
    const shown = plain(data, { fable: young });
    assert.match(shown, /✧ █?░* +12% ↻Oct 12 at \d{1,2}(:\d\d)?[ap]m/);
    const old = readUsage(env(NOW - 2 * FABLE_MAX_AGE_MS, [ALL, ROW]), NOW);
    assert.equal(old.fable, null);
    assert.ok(
      !plain(data, { fable: old.fable }).includes("✧"),
      plain(data, { fable: old.fable }),
    );
    assert.equal(readUsage(env(NOW, [ALL]), NOW).fable, null);
  } finally {
    for (const dir of dirs) fs.rmSync(dir, { recursive: true, force: true });
  }
});
