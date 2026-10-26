// The usage gradient of the context, `5h`, and `7d` values, the countdown gradient, the dim labels, and the file of the last `rate_limits` (spec `status-line`).

import { expect, test } from "bun:test";
import { main } from "../../../plugins/claudetto/modules/statusline/adapters/cli.ts";
import { depsFor, NOW, type Run, runMain, STATUS } from "./support.ts";

const ESC = String.fromCharCode(27);
const GREEN = `${ESC}[38;2;78;186;101m`;
const AMBER = `${ESC}[38;2;255;193;7m`;
const RED = `${ESC}[38;2;255;107;128m`;
const MIDDLE = `${ESC}[38;2;167;190;54m`;
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
  expect(await outputOf(20, 10)).toContain(`${GREEN}20%${RESET}`);
});

test("Middle Usage", async () => {
  expect(await outputOf(10, 40)).toContain(`${MIDDLE}40%${RESET}`);
  expect(await outputOf(60, 10)).toContain(`${AMBER}60%${RESET}`);
});

test("High Usage", async () => {
  expect(await outputOf(90, 100)).toContain(`${RED}90%${RESET}`);
  expect(await outputOf(90, 100)).toContain(`${RED}100%${RESET}`);
});

/** The colored output of `main` for the `5h` window at `used` percent with `leftS` seconds to its reset, and the other windows from `extra`. */
const countdownOf = async (
  used: number,
  leftS: number,
  extra: Record<string, unknown> = {},
): Promise<string> => {
  const run: Run = { status: -1, out: [], err: [] };
  await main(
    [],
    depsFor(
      {
        ...STATUS,
        rate_limits: {
          five_hour: { used_percentage: used, resets_at: NOW / 1000 + leftS },
          ...extra,
        },
      },
      run,
      { env: { COLUMNS: "200" } },
    ),
  );
  return run.out.join("\n");
};

test("Reset Soon", async () => {
  expect(await countdownOf(10, 1800)).toContain(`${GREEN}↻`);
});

test("a reset with the whole window left has the red stop color", async () => {
  expect(await countdownOf(10, 5 * 3600)).toContain(`${RED}↻`);
});

test("Run-Out Now", async () => {
  const out = await countdownOf(99, 9000);
  expect(out).toContain(`${ESC}[38;2;255;108;127m⏵`);
});

test("a run-out close to the reset has a color close to the amber stop", async () => {
  const out = await countdownOf(50.5, 9000);
  expect(out).toContain(`${ESC}[38;2;255;191;9m⏵`);
});

test("Spend Reset", async () => {
  const out = await countdownOf(10, 1800, {
    spend_limit: {
      used_percentage: 10,
      used_usd: 5,
      limit_usd: 50,
      resets_at: NOW / 1000 + 1800,
    },
  });
  expect(out).toContain(`${DIM}↻`);
});

test("Labels", async () => {
  const out = await outputOf(25, 10);
  expect(out).toContain(`${DIM}▤ ctx${RESET}`);
  expect(out).toContain(`${DIM}5h${RESET}`);
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

test("a failed write of the `rate_limits` goes to stderr, and the line still prints with exit 0", async () => {
  const run = await runMain(STATUS, {
    env: { COLUMNS: "200", TMPDIR: "/var/tmp" },
    write: async (file) => {
      if (file.endsWith("claudetto-rate-limits.json"))
        throw new Error("disk full");
    },
  });
  expect(run.status).toBe(0);
  expect(run.err.length).toBeGreaterThan(0);
  expect(run.out.join("\n")).toContain("15%");
});
