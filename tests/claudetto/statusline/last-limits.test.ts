// The last reading of a limit window: a window that the input leaves out shows dimmed with its age until its `resets_at` passes.

import { expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { cacheFolder } from "../../../plugins/claudetto/modules/statusline/adapters/git-cache.ts";
import {
  limitsFile,
  withLastLimits,
} from "../../../plugins/claudetto/modules/statusline/adapters/last-limits.ts";
import { memoryFiles, NOW, outputOf, STATUS } from "./support.ts";

const MINUTE = 60_000;
const DIM = "\x1b[2m";
const { seven_day: _, ...onlyFiveHour } = STATUS.rate_limits;
const NO_SEVEN_DAY = { ...STATUS, rate_limits: onlyFiveHour };
const SPEND = { used_usd: 5, limit_usd: 50, period: "month" };
const WITH_SPEND = {
  ...STATUS,
  rate_limits: { ...STATUS.rate_limits, spend_limit: SPEND },
};

/** The limits row of one run of `main` on `input` at `now`, on the files of `memory`. */
const limitsRow = async (
  input: unknown,
  now: number,
  memory: ReturnType<typeof memoryFiles>,
  env: Record<string, string> = { NO_COLOR: "1" },
): Promise<string> => {
  const out = await outputOf(input, env, {
    now: () => now,
    files: memory.reader,
    write: memory.write,
  });
  return out.split("\n")[2] ?? "";
};

test("an input with no `seven_day` after one with it shows the last `7d` reading with its age", async () => {
  const memory = memoryFiles();
  await limitsRow(STATUS, NOW, memory);

  const row = await limitsRow(NO_SEVEN_DAY, NOW + 5 * MINUTE, memory);

  expect(row).toContain("◷ 5h 23%");
  expect(row).toContain("◷ 7d 80%");
  expect(row).toContain("5m");
});

test("the last reading shows in the dim color, with no color of its own", async () => {
  const memory = memoryFiles();
  await limitsRow(STATUS, NOW, memory, {});

  const row = await limitsRow(NO_SEVEN_DAY, NOW + MINUTE, memory, {});

  const seven = row.split(" · ")[1] ?? "";
  expect(seven.startsWith(`${DIM}◷ 7d`)).toBe(true);
  expect(seven).not.toContain("\x1b[38;");
});

test("a reading past its `resets_at` shows nothing", async () => {
  const memory = memoryFiles();
  await limitsRow(STATUS, NOW, memory);
  const afterReset = (STATUS.rate_limits.seven_day.resets_at + 60) * 1000;

  const row = await limitsRow(NO_SEVEN_DAY, afterReset, memory);

  expect(row).not.toContain("◷ 7d");
});

test("a window with no `resets_at`, such as the spend limit, shows no last reading", async () => {
  const memory = memoryFiles();
  expect(await limitsRow(WITH_SPEND, NOW, memory)).toContain("spend");

  const row = await limitsRow(STATUS, NOW + MINUTE, memory);

  expect(row).not.toContain("spend");
});

test("the same windows within a minute of the saved reading write no file, also with a spend limit", async () => {
  const memory = memoryFiles();
  let writes = 0;
  const counted = {
    ...memory,
    write: async (file: string, text: string) => {
      if (file.includes("claudetto-limits-")) writes++;
      await memory.write(file, text);
    },
  };
  await limitsRow(WITH_SPEND, NOW, counted);

  await limitsRow(WITH_SPEND, NOW + 1000, counted);
  await limitsRow(WITH_SPEND, NOW + 2000, counted);

  expect(writes).toBe(1);
});

test("Two Accounts: a reading of one `CLAUDE_CONFIG_DIR` does not show for another", async () => {
  const memory = memoryFiles();
  await limitsRow(STATUS, NOW, memory, {
    NO_COLOR: "1",
    CLAUDE_CONFIG_DIR: "/a",
  });

  const row = await limitsRow(NO_SEVEN_DAY, NOW + MINUTE, memory, {
    NO_COLOR: "1",
    CLAUDE_CONFIG_DIR: "/b",
  });

  expect(row).not.toContain("◷ 7d");
});

test("an unsafe cache folder is not read or written", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "last-limits-"));
  const folder = path.join(root, `claudetto-git-${os.userInfo().uid}`);
  fs.mkdirSync(folder);
  fs.chmodSync(folder, 0o755);
  const memory = memoryFiles();
  const saved = {
    seven_day: { at: NOW, window: STATUS.rate_limits.seven_day },
  };
  memory.files.set(limitsFile(folder) as string, JSON.stringify(saved));
  const ports = { files: memory.reader, write: memory.write, now: () => NOW };

  const { limits, ages } = await withLastLimits(
    { rate_limits: onlyFiveHour },
    ports,
    () => {},
    limitsFile(cacheFolder(root)),
  );

  expect(limits.seven_day).toBeUndefined();
  expect(ages).toStrictEqual({});
  expect(memory.files.size).toBe(1);
});
