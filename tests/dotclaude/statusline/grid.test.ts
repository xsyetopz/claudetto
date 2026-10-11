// Tests of the three-column grid, the context breakdown, and the Fable window of the status line (design D33).

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { stripVTControlCharacters } from "node:util";
import {
  parseFable,
  readUsage,
} from "../../../plugins/dotclaude/features/statusline/credits.ts";
import { fitRows } from "../../../plugins/dotclaude/features/statusline/layout.ts";
import { FABLE_MAX_AGE_MS } from "../../../plugins/dotclaude/features/statusline/limits.ts";
import { width } from "../../../plugins/dotclaude/features/statusline/paint.ts";
import { placeGroup } from "../../../plugins/dotclaude/features/statusline/place.ts";
import { render } from "../../../plugins/dotclaude/features/statusline/render.ts";
import { usageGroups } from "../../../plugins/dotclaude/features/statusline/segments.ts";
import type {
  Fable,
  FableLimit,
  GitState,
  RenderCtx,
  Spec,
  StatusInput,
} from "../../../plugins/dotclaude/features/statusline/types.ts";
import { tmpDir } from "../../support/repo.ts";

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
const git: GitState = { branch: "main", dirty: 0, ahead: 0, behind: 0 };
const spec: Spec = { id: "dotclaude-0-28-0", done: 3, total: 10 };
const fable: Fable = { percent: 12, resetsAt: sec + 2 * 86_400 };
const plain = (d: StatusInput, ctx?: Partial<RenderCtx>) =>
  stripVTControlCharacters(
    render(d, {
      now: NOW,
      columns: 200,
      git,
      spec,
      ...ctx,
    } as RenderCtx),
  );

const tmp = () => tmpDir("dc-grid");
/** The fixed parts of a `/context` table, in tokens. */
const table = { system: 7700, memory: 1600, skills: 1886 };

test("wide terminal: 3 rows, with the model, the context, and the 5-hour window starting row 1", () => {
  const rows = plain(data, { fable, table }).split("\n") as [
    string,
    string,
    string,
  ];
  expect(rows.length).toBe(3);
  const [model, ctx, window] = ["◆ Opus 5.5", "◧", "5h"].map((t) =>
    rows[0].indexOf(t),
  ) as [number, number, number];
  expect(model).toBe(0);
  expect(ctx > model, `${ctx}`).toBeTruthy();
  expect(window > ctx, `${window}`).toBeTruthy();
  // The columns line up: row 2 and row 3 start the middle and the right cell at the same offsets.
  expect(rows[1].indexOf("⊛")).toBe(ctx);
  expect(rows[1].indexOf("7d")).toBe(window);
  expect(rows[2].indexOf("✦")).toBe(ctx);
  expect(rows[2].indexOf("✧")).toBe(window);
  expect(rows[1].includes("▤ dotclaude-0-28-0"), rows[1]).toBeTruthy();
  expect(rows[2].startsWith("✓ 3/10 · ⎇ main"), rows[2]).toBeTruthy();
});

test("the other segments fill a cell only while the columns fit, and the lowest priority goes first", () => {
  const more = {
    ...data,
    cost: { total_cost_usd: 6, total_duration_ms: 7_200_000 },
    pr: { number: 12 },
  };
  const wide = plain(more, { fable, table, columns: 300 });
  expect(wide.includes("$6.00"), wide).toBeTruthy();
  expect(wide.includes("#12"), wide).toBeTruthy();
  const at = (columns: number) => plain(more, { fable, table, columns });
  // Shrink the width: `cost` (priority 3) goes before `pr` (priority 4), and the base cells stay.
  let columns = 300;
  while (at(columns).includes("$6.00")) columns -= 1;
  expect(at(columns).includes("#12"), at(columns)).toBeTruthy();
  while (at(columns).includes("#12")) columns -= 1;
  expect(at(columns).includes("5h"), at(columns)).toBeTruthy();
  expect(at(columns).split("\n").length).toBe(3);
});

test("narrow terminal: the row packing, and no row wider than the columns", () => {
  const input = { ...data, cost: { total_cost_usd: 6 }, pr: { number: 12 } };
  const ctx = { now: NOW, columns: 70, git, spec, fable, table } as RenderCtx;
  const out = render(input, ctx);
  const expected = fitRows(
    [...usageGroups(input, ctx), placeGroup(input, ctx)],
    70,
  ).join("\n");
  expect(out).toBe(expected);
  for (const row of out.split("\n"))
    expect(width(row) <= 70, `${width(row)}`).toBeTruthy();
});

test("an empty cell stays blank, and a column with no cells is left out", () => {
  const { rate_limits: _limits, ...noRight } = data;
  const rows = plain(noRight, { spec: null, git: null }).split("\n") as [
    string,
    string,
    string,
  ];
  // The left and middle columns remain, and nothing of the right column shows.
  expect(rows.join("\n")).not.toMatch(/5h|7d|✧/);
  expect(rows[0].startsWith("◆ Opus 5.5"), rows[0]).toBeTruthy();
  expect(rows[1].trim().startsWith("▣ app"), rows[1].trim()).toBeTruthy();
});

test("no table: the middle column shows the meter and the free tokens only", () => {
  const out = plain(data, { table: null });
  expect(out.includes("◧"), out).toBeTruthy();
  expect(out.includes("◇ 193k"), out).toBeTruthy();
  expect(out).not.toMatch(/[⊛☰✦❝]/);
});

// The rows are the JSON of the usage cache, where `null` stands for a missing `scope` and `id`.
const ROW = {
  kind: "weekly_scoped",
  percent: 12,
  resets_at: "2026-10-12T04:00:00+00:00",
  scope: { model: { id: null, display_name: "Fable" } },
} satisfies FableLimit;
const ALL = {
  kind: "weekly_all",
  percent: 47,
  scope: null,
} satisfies FableLimit;

test("fable: only the weekly_scoped row of Fable gives the window", () => {
  expect(parseFable([ALL, ROW])).toStrictEqual({
    percent: 12,
    resetsAt: Date.parse(ROW.resets_at) / 1000,
  });
  const other = { ...ROW, scope: { model: { display_name: "Opus" } } };
  expect(parseFable([ALL, other])).toBe(null);
  expect(parseFable([{ ...ROW, kind: "weekly_all" }])).toBe(null);
  expect(parseFable(undefined)).toBe(null);
  expect((parseFable([{ ...ROW, resets_at: "x" }]) as Fable).resetsAt).toBe(
    null,
  );
});

test("fable: the window shows with its reset for a cache of 10 minutes, and is hidden at 2 hours", async () => {
  const dirs: string[] = [];
  const env = async (fetchedAtMs: number, limits: unknown[]) => {
    const dir = tmp();
    dirs.push(dir);
    await Bun.write(
      path.join(dir, ".claude.json"),
      JSON.stringify({
        cachedUsageUtilization: { fetchedAtMs, utilization: { limits } },
      }),
    );
    return { CLAUDE_CONFIG_DIR: dir };
  };
  try {
    const young = (await readUsage(await env(NOW - 600_000, [ALL, ROW]), NOW))
      .fable as Fable;
    expect(young.percent).toBe(12);
    const shown = plain(data, { fable: young });
    expect(shown).toMatch(/✧ █?░* +12% ↻Oct 12 at \d{1,2}(:\d\d)?[ap]m/);
    const old = await readUsage(
      await env(NOW - 2 * FABLE_MAX_AGE_MS, [ALL, ROW]),
      NOW,
    );
    expect(old.fable).toBe(null);
    expect(
      !plain(data, { fable: old.fable }).includes("✧"),
      plain(data, { fable: old.fable }),
    ).toBeTruthy();
    expect((await readUsage(await env(NOW, [ALL]), NOW)).fable).toBe(null);
  } finally {
    for (const dir of dirs) fs.rmSync(dir, { recursive: true, force: true });
  }
});
