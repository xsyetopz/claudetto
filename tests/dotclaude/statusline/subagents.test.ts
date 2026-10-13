// The rows of `dotclaude-statusline --subagent`.

import { expect, test } from "bun:test";
import { main } from "../../../src/plugins/dotclaude/slices/statusline/adapters/cli.ts";
import { SUBAGENT_ROWS_MAX } from "../../../src/plugins/dotclaude/slices/statusline/limits.ts";
import { width } from "../../../src/plugins/dotclaude/slices/statusline/width.ts";
import { depsFor, NOW, type Run } from "./support.ts";

const ESC = String.fromCharCode(27);

const rowsFor = async (input: unknown, env: Record<string, string> = {}) => {
  const run: Run = { status: -1, out: [], err: [] };
  run.status = await main(
    ["--subagent"],
    depsFor(input, run, { env: { COLUMNS: "100", NO_COLOR: "1", ...env } }),
  );
  return { run, rows: run.out.map((line) => JSON.parse(line)) };
};

const task = {
  id: "t1",
  name: "builder",
  agentType: "dotclaude:implementer",
  status: "running",
  description: "Rebuild the status line",
  startTime: NOW - 3 * 60_000,
  model: "claude-sonnet-5-5",
  effort: "high",
  contextWindowSize: 300_000,
  tokenCount: 60_000,
};

test("a running task gives one JSON row with its id and a line of numbers", async () => {
  const { run, rows } = await rowsFor({ columns: 100, tasks: [task] });
  expect(run.status).toBe(0);
  expect(rows).toStrictEqual([
    {
      id: "t1",
      content:
        "● builder (implementer) sonnet 5.5 high · ▤ 60k/300k 20% · ◔ 3m · Rebuild the status line",
    },
  ]);
});

test("a task that is not running, or has no id, gives no row", async () => {
  const { rows } = await rowsFor({
    tasks: [
      { ...task, id: "t2", status: "completed" },
      { ...task, id: undefined },
      { ...task, id: "t3", status: undefined },
    ],
  });
  expect(rows.map((row) => row.id)).toStrictEqual(["t3"]);
});

test("the rows are at most `SUBAGENT_ROWS_MAX`, and each row fits the width of the input", async () => {
  const tasks = Array.from({ length: SUBAGENT_ROWS_MAX + 5 }, (_, i) => ({
    ...task,
    id: `t${i}`,
  }));
  const { rows } = await rowsFor({ columns: 40, tasks });
  expect(rows).toHaveLength(SUBAGENT_ROWS_MAX);
  for (const row of rows) expect(width(row.content)).toBeLessThanOrEqual(40);
});

test("the color run has sequences, and `NO_COLOR` has none", async () => {
  const colored = await rowsFor({ tasks: [task] }, { NO_COLOR: "" });
  expect(colored.rows[0].content).toContain(ESC);
  const plain = await rowsFor({ tasks: [task] });
  expect(plain.rows[0].content).not.toContain(ESC);
});

test("input that is not JSON, and input with no tasks, give no output and exit with 0", async () => {
  for (const input of ["{", "[]", {}, { tasks: "none" }]) {
    const { run } = await rowsFor(input);
    expect(run.status).toBe(0);
    expect(run.out).toStrictEqual([]);
    expect(run.err).toStrictEqual([]);
  }
});

test("a failure gives no output on stdout, so the rows keep the default look, and the cause goes to stderr", async () => {
  const run: Run = { status: -1, out: [], err: [] };
  run.status = await main(
    ["--subagent"],
    depsFor("", run, {
      stdin: async () => {
        throw new Error("stdin closed");
      },
    }),
  );
  expect(run.status).toBe(0);
  expect(run.out).toStrictEqual([]);
  expect(run.err.join("")).toContain("stdin closed");
});
