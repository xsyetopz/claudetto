// The rules of the git state and the served-model mark. No command runs and no file is read.

import { expect, test } from "bun:test";
import {
  isSubstitute,
  servedMark,
} from "../../../src/plugins/claudetto/slices/repostate/domain/served.ts";
import {
  existingTag,
  manifestOf,
  stateContext,
  tagNames,
} from "../../../src/plugins/claudetto/slices/repostate/domain/state.ts";

test("a manifest needs a JSON object with a text `version`", () => {
  expect(manifestOf("package.json", '{"name":"a","version":"1.0.0"}')).toEqual({
    file: "package.json",
    version: "1.0.0",
    name: "a",
  });
  expect(manifestOf("package.json", '{"name":"a"}')).toBeNull();
  expect(manifestOf("package.json", "not json")).toBeNull();
  expect(manifestOf("package.json", "[1]")).toBeNull();
});

test("the tag names are the plain, the `v`, and the `claude plugin tag` forms", () => {
  expect(tagNames("1.0.0", ["a"])).toEqual(["1.0.0", "v1.0.0", "a--v1.0.0"]);
});

test("`existingTag` matches a whole line", () => {
  expect(existingTag(["1.0.0", "v1.0.0"], "v1.0.0\nv1.0.0-rc\n")).toBe(
    "v1.0.0",
  );
  expect(existingTag(["1.0.0"], "1.0.0-rc\n")).toBeNull();
});

const base = { describe: "v0-3-gabc", branch: "main", files: [], checked: [] };

test("a state with no manifest says that it has no version", () => {
  expect(stateContext({ ...base, manifest: null, tag: null })).toContain(
    "give no version",
  );
});

test("a state names the version and the tag, or says that the tag is missing", () => {
  const manifest = { file: "package.json", version: "1.0.0", name: "a" };
  const files = ["package.json"];
  const checked = ["1.0.0", "v1.0.0"];
  expect(
    stateContext({ ...base, manifest, files, checked, tag: "v1.0.0" }),
  ).toContain("the tag `v1.0.0` exists");
  expect(
    stateContext({ ...base, manifest, files, checked, tag: null }),
  ).toContain("has no tag");
});

test("a date suffix is no substitute, and another family or minor is", () => {
  expect(isSubstitute("claude-opus-5-5", "claude-opus-5-5-20260101")).toBe(
    false,
  );
  expect(isSubstitute("claude-opus-5-5", "claude-sonnet-5-5")).toBe(true);
  expect(isSubstitute("claude-opus-5-5", "claude-opus-5-4")).toBe(true);
  expect(isSubstitute("custom-model", "claude-opus-5-5")).toBe(false);
});

test("the mark names both models", () => {
  const mark = servedMark("claude-opus-5-5", "claude-sonnet-5-5");
  expect(mark).toContain("claude-opus-5-5");
  expect(mark).toContain("claude-sonnet-5-5");
});
