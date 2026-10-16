// The path words (`domain/paths.ts`).

import { expect, test } from "bun:test";
import {
  normalize,
  touchesStore,
  under,
} from "../../../src/plugins/claudetto/slices/policy/domain/paths.ts";

test("`normalize` removes `.` and `..` parts in the text", () => {
  expect(normalize("/a/b/../c/./d")).toBe("/a/c/d");
  expect(normalize("/a/../..")).toBe("/");
  expect(normalize("../x")).toBe("../x");
  expect(normalize("a//b/")).toBe("a/b");
});

test("`under` joins a relative word and keeps an absolute word", () => {
  expect(under("/w", "a/../b")).toBe("/w/b");
  expect(under("/w", "/x")).toBe("/x");
  expect(under("/w", "~/x")).toBe("~/x");
  expect(under(undefined, "a/b")).toBe("a/b");
});

test("`touchesStore` holds for the store, its folder, and a glob there", () => {
  for (const p of [
    "~/.claudetto/policy/a.json",
    "/home/me/.claudetto/policy",
    "/home/me/.claudetto",
    "/home/me/.claudetto/*",
    "/tmp/../home/me/.claudetto/policy/x",
    "$HOME/.claudetto/policy/x",
  ])
    expect(touchesStore(p), p).toBe(true);
  for (const p of [
    "/home/me/.claudetto/cache",
    "/work/policy/a",
    "/work/claudetto/policy",
    "",
  ])
    expect(touchesStore(p), p).toBe(false);
});
