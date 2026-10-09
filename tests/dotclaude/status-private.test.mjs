// Tests of the private folder of the status line files (a folder for each user, with mode `0700`).

import { expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { cached } from "../../plugins/dotclaude/features/statusline/cache.mjs";
import { recordBurn } from "../../plugins/dotclaude/features/statusline/state.mjs";
import { privateDir } from "../../plugins/dotclaude/lib/private-dir.mjs";

const base = () => fs.mkdtempSync(path.join(os.tmpdir(), "dc-private-"));

test("the folder is named with the user id and has mode `0700`", () => {
  const root = base();
  try {
    const dir = privateDir(root);
    expect(dir).toBe(
      path.join(
        root,
        `dotclaude-status-${process.getuid?.() ?? os.userInfo().username}`,
      ),
    );
    expect(fs.statSync(dir).mode & 0o777).toBe(0o700);
  } finally {
    fs.rmSync(root, { recursive: true });
  }
});

test("a folder that exists with a wider mode is set to `0700`", () => {
  const root = base();
  try {
    const dir = privateDir(root);
    fs.chmodSync(dir, 0o777);
    expect(privateDir(root)).toBe(dir);
    expect(fs.statSync(dir).mode & 0o777).toBe(0o700);
  } finally {
    fs.rmSync(root, { recursive: true });
  }
});

test("a link in place of the folder is not used", () => {
  const root = base();
  const target = base();
  try {
    const dir = path.join(
      root,
      `dotclaude-status-${process.getuid?.() ?? os.userInfo().username}`,
    );
    fs.symlinkSync(target, dir);
    expect(privateDir(root)).toBeUndefined();
  } finally {
    fs.rmSync(root, { recursive: true });
    fs.rmSync(target, { recursive: true });
  }
});

test("a base that cannot be written gives no folder, and the helpers stay quiet", () => {
  const missing = path.join(base(), "file");
  fs.writeFileSync(missing, "");
  const dir = privateDir(path.join(missing, "sub"));
  expect(dir).toBeUndefined();
  expect(cached("k", () => 7, 0, dir)).toBe(7);
  expect(
    recordBurn("a", { used_percentage: 5, resets_at: 9 }, 1, dir).samples,
  ).toHaveLength(1);
});
