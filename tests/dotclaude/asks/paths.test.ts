// The path operations of `slices/asks/domain/paths.ts` against `node:path`.
// The `posix` checks use the inputs of a macOS or Linux path.
// The `win32` checks use the inputs of a Windows path, with a drive letter and mixed separators.
// The results of `win32` have `\`, so the test turns them into `/` before the comparison.

import { expect, test } from "bun:test";
import path from "node:path";
import * as paths from "../../../src/plugins/dotclaude/slices/asks/domain/paths.ts";

const { posix, win32 } = path;
const slash = (text: string) => text.replace(/\\/g, "/");

const POSIX_PATHS = [
  "/a/b",
  "/a/b/../c",
  "/a/./b/",
  "/../a",
  "/",
  "a/b",
  "a/../..",
  "",
];
const WIN_PATHS = [
  "C:\\a\\b",
  "C:/a/b",
  "C:\\a\\..\\b",
  "C:\\a/b\\..\\c",
  "D:\\x\\",
  "C:foo\\bar",
];

test("isAbsolute gives the answer of posix for a posix path", () => {
  for (const p of POSIX_PATHS)
    expect(paths.isAbsolute(p)).toBe(posix.isAbsolute(p));
});

test("isAbsolute gives the answer of win32 for a drive or a mixed path", () => {
  for (const p of WIN_PATHS)
    expect(paths.isAbsolute(p)).toBe(win32.isAbsolute(p));
});

test("normalize gives the result of posix for a posix path", () => {
  for (const p of POSIX_PATHS)
    expect(paths.normalize(p)).toBe(posix.normalize(p));
});

test("normalize gives the result of win32 with `/` for a drive path", () => {
  for (const p of WIN_PATHS)
    expect(paths.normalize(p)).toBe(slash(win32.normalize(p)));
});

test("resolve gives the result of posix for absolute and `..` inputs", () => {
  expect(paths.resolve("/a", "b/../c")).toBe(posix.resolve("/a", "b/../c"));
  expect(paths.resolve("/a/", "/b")).toBe(posix.resolve("/a/", "/b"));
  expect(paths.resolve("/a", "")).toBe(posix.resolve("/a", ""));
  expect(paths.resolve("/a/b/")).toBe(posix.resolve("/a/b/"));
  expect(paths.resolve("/x", "../../y")).toBe(posix.resolve("/x", "../../y"));
});

test("resolve gives the result of win32 with `/` for drive inputs", () => {
  expect(paths.resolve("C:\\a", "..\\b")).toBe(
    slash(win32.resolve("C:\\a", "..\\b")),
  );
  expect(paths.resolve("C:\\a", "D:\\b")).toBe(
    slash(win32.resolve("C:\\a", "D:\\b")),
  );
  expect(paths.resolve("C:/a", "b\\c")).toBe(
    slash(win32.resolve("C:/a", "b\\c")),
  );
});

test("resolve keeps a relative result relative, since it has no cwd", () => {
  expect(paths.resolve("", "x/y")).toBe("x/y");
});

test("relative gives the result of posix for absolute paths", () => {
  const pairs: [string, string][] = [
    ["/a/b", "/a/c/d"],
    ["/a", "/a"],
    ["/a/b/", "/a/b"],
    ["/a/b", "/x"],
    ["/a/../b", "/b/c"],
  ];
  for (const [from, to] of pairs)
    expect(paths.relative(from, to)).toBe(posix.relative(from, to));
});

test("relative gives the result of posix for two relative paths", () => {
  expect(paths.relative("a/b", "c")).toBe(posix.relative("a/b", "c"));
});

test("relative gives the result of win32 with `/` for drive paths", () => {
  const pairs: [string, string][] = [
    ["C:\\a\\b", "C:\\a\\c\\d"],
    ["C:/a", "C:\\a\\b"],
    ["C:\\a", "D:\\b"],
  ];
  for (const [from, to] of pairs)
    expect(paths.relative(from, to)).toBe(slash(win32.relative(from, to)));
});
