// The usage gradient of the context, `5h`, and `7d` values, the dim labels, and the file of the last `rate_limits` (spec `status-line`).

import { expect, test } from "bun:test";
import { main } from "../../../plugins/claudetto/slices/statusline/adapters/cli.ts";
import { depsFor, NOW, type Run, STATUS } from "./support.ts";

const ESC = String.fromCharCode(27);
const GREEN = `${ESC}[38;2;78;186;101m`;
const AMBER = `${ESC}[38;2;255;193;7m`;
const RED = `${ESC}[38;2;255;107;128m`;
const DIM = `${ESC}[2m`;
const RESET = `${ESC}[0m`;

const RESETS_AT = NOW / 1000 + 3 * 3600;

/** The colored output of `main` for `STATUS` with the context at `context` percent and the `5h` window at `plan` percent. */
const outputOf = async (context: number, plan: number): Promise<string> => {
  const run: Run = { status: -1, out: [], err: [] };
  await main(
    [],
    depsFor(
      {
        ...STATUS,
        context_window: { ...STATUS.context_window, used_percentage: context },
        rate_limits: {
          five_hour: { used_percentage: plan, resets_at: RESETS_AT },
        },
      },
      run,
      { env: { COLUMNS: "200" } },
    ),
  );
  return run.out.join("\n");
};

test("Low Usage", async () => {
  expect(await outputOf(25, 10)).toContain(`${GREEN}25%${RESET}`);
});

test("Middle Usage", async () => {
  expect(await outputOf(10, 40)).toContain(`${AMBER}40%${RESET}`);
  expect(await outputOf(10, 80)).toContain(`${AMBER}80%${RESET}`);
});

test("High Usage", async () => {
  expect(await outputOf(81, 81)).toContain(`${RED}81%${RESET}`);
  expect(await outputOf(81, 81)).not.toContain(`${AMBER}81%`);
});

test("Labels", async () => {
  const out = await outputOf(25, 10);
  expect(out).toContain(`${DIM}▤ ctx${RESET}`);
  expect(out).toContain(`${DIM}5h${RESET}`);
  expect(out).toContain(`${DIM}↻`);
});

test("Theme Option", async () => {
  const run: Run = { status: -1, out: [], err: [] };
  await main(
    [],
    depsFor(STATUS, run, {
      env: { COLUMNS: "200" },
      files: {
        read: async (file) =>
          file === "/home/user/.claude.json" ? '{"theme":"light"}' : null,
        list: async () => [],
      },
    }),
  );
  expect(run.out.join("\n")).toContain(`${GREEN}15%${RESET}`);
});

const limitsRun = async (input: unknown, written: [string, string][]) => {
  const run: Run = { status: -1, out: [], err: [] };
  await main(
    [],
    depsFor(input, run, {
      env: { COLUMNS: "200", TMPDIR: "/var/tmp" },
      write: async (file, text) => {
        if (file.endsWith("claudetto-rate-limits.json"))
          written.push([file, text]);
      },
    }),
  );
  return run;
};

test("Input with Limits", async () => {
  const written: [string, string][] = [];
  await limitsRun(STATUS, written);
  expect(written).toStrictEqual([
    ["/var/tmp/claudetto-rate-limits.json", JSON.stringify(STATUS.rate_limits)],
  ]);
});

test("Input with No Limits", async () => {
  const written: [string, string][] = [];
  const { rate_limits: _, ...input } = STATUS;
  const run = await limitsRun(input, written);
  expect(written).toStrictEqual([]);
  expect(run.err).toStrictEqual([]);
});
