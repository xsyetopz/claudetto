// The notice of the cleanup (spec `session-hygiene`, "Notices Report a Change").

import { expect, test } from "bun:test";
import {
  removedNotice,
  sizeOf,
} from "../../../../plugins/claudetto/modules/session/hygiene/domain/notice.ts";

const NONE = { folders: 0, files: 0, worktrees: 0, probes: 0, bytes: 0 };

test("Removed Folders: 1 folder of 2 MB gives `removed 1 folder` with the size", () => {
  const text = removedNotice({ ...NONE, folders: 1, bytes: 2 * 1024 * 1024 });
  expect(text).toContain("1 folder");
  expect(text).toContain("2 MB");
});

test("Two Folders: each count agrees in number with its noun", () => {
  const text = removedNotice({ ...NONE, folders: 2, files: 1, bytes: 2048 });
  expect(text).toContain("2 folders");
  expect(text).toContain("1 file ");
});

test("Nothing Removed: a cleanup that removes nothing has no notice", () => {
  expect(removedNotice(NONE)).toBeNull();
});

test("`sizeOf` uses a unit of 1,024 steps with at most one decimal", () => {
  expect(sizeOf(0)).toBe("0 B");
  expect(sizeOf(1023)).toBe("1023 B");
  expect(sizeOf(1024)).toBe("1 KB");
  expect(sizeOf(3 * 1024 ** 3)).toBe("3 GB");
});
