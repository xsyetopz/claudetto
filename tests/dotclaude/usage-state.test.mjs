// The usage state file of design D32: the status line writes the windows, and the context hook reads them.

import { expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  accountOf,
  readUsage,
  usageFile,
  writeUsage,
} from "../../plugins/dotclaude/lib/usage-state.mjs";

const withDir = (fn) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "usage-"));
  try {
    fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
};

const NOW = 1_000_000;
const five = {
  used_percentage: 82,
  resets_at: NOW + 3600,
  run_out_at: NOW + 720,
};
const seven = {
  used_percentage: 40,
  resets_at: NOW + 86_400,
  run_out_at: null,
};

test("a written window reads back while it is current", () => {
  withDir((dir) => {
    writeUsage("a", { five_hour: five, seven_day: seven }, NOW, dir);
    expect(readUsage("a", NOW + 60, dir)).toEqual({
      five_hour: five,
      seven_day: seven,
    });
  });
});

test("a window past its reset is not current, and with none current the read gives `undefined`", () => {
  withDir((dir) => {
    writeUsage("a", { five_hour: five, seven_day: seven }, NOW, dir);
    expect(readUsage("a", NOW + 3600, dir)).toEqual({ seven_day: seven });
    expect(readUsage("a", NOW + 86_400, dir)).toBeUndefined();
  });
});

test("a file written before the window started is not current", () => {
  withDir((dir) => {
    const later = { ...five, resets_at: NOW + 5 * 3600 + 10 };
    writeUsage("a", { five_hour: later }, NOW, dir);
    expect(readUsage("a", NOW + 60, dir)).toBeUndefined();
  });
});

test("no file, a broken file, or no folder gives `undefined`", () => {
  withDir((dir) => {
    expect(readUsage("a", NOW, dir)).toBeUndefined();
    fs.writeFileSync(usageFile("a", dir), "{");
    expect(readUsage("a", NOW, dir)).toBeUndefined();
    expect(readUsage("a", NOW, undefined)).toBeUndefined();
  });
});

test("each account has its own file", () => {
  withDir((dir) => {
    writeUsage("a", { five_hour: five }, NOW, dir);
    expect(readUsage("b", NOW, dir)).toBeUndefined();
  });
});

test("the account is `CLAUDE_CONFIG_DIR`, else the home folder", () => {
  expect(accountOf({ CLAUDE_CONFIG_DIR: "/c" })).toBe("/c");
  expect(accountOf({})).toBe(os.homedir());
});
