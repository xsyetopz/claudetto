// The effective window: the percent is the used tokens against `windowOf(size)`, or against `HAIKU_AUTOCOMPACT_WINDOW` for a Haiku subagent.

import { expect, test } from "bun:test";
import {
  HAIKU_AUTOCOMPACT_WINDOW,
  windowOf,
} from "../../../src/kernel/budget.ts";
import { main } from "../../../src/plugins/claudetto/slices/statusline/adapters/cli.ts";
import { windowText } from "../../../src/plugins/claudetto/slices/statusline/format.ts";
import { depsFor, NOW, type Run, rowsOf } from "./support.ts";

test("a main session with a 1M window shows the percent of 300k, from the used tokens", async () => {
  const { text } = await rowsOf(
    {
      model: { id: "claude-opus-5-5" },
      context_window: {
        total_input_tokens: 120_000,
        context_window_size: 1_000_000,
        used_percentage: 12,
      },
    },
    { env: { COLUMNS: "160", NO_COLOR: "1" } },
  );
  expect(text).toContain(`▤ 40% of ${windowText(windowOf(1_000_000))} `);
});

const subagentRow = async (task: Record<string, unknown>) => {
  const run: Run = { status: -1, out: [], err: [] };
  await main(
    ["--subagent"],
    depsFor({ columns: 100, tasks: [task] }, run, {
      env: { COLUMNS: "100", NO_COLOR: "1" },
    }),
  );
  return JSON.parse(run.out[0] ?? "{}").content as string;
};

const base = {
  id: "t1",
  name: "scout",
  status: "running",
  startTime: NOW - 60_000,
  tokenCount: 60_000,
};

test("a Haiku subagent row shows the percent of the Haiku window", async () => {
  const content = await subagentRow({
    ...base,
    model: "claude-haiku-4-5",
    contextWindowSize: 1_000_000,
  });
  const percent = Math.round((60_000 / HAIKU_AUTOCOMPACT_WINDOW) * 100);
  expect(content).toContain(
    `60k/${windowText(HAIKU_AUTOCOMPACT_WINDOW)} ${percent}%`,
  );
});

test("another subagent row shows the percent of `windowOf(size)`", async () => {
  const content = await subagentRow({
    ...base,
    model: "claude-sonnet-5-5",
    contextWindowSize: 1_000_000,
  });
  expect(content).toContain("60k/300k 20%");
});
