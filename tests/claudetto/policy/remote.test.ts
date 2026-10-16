// The reading of remote URLs and `gh -R` values (`domain/remote.ts`).

import { expect, test } from "bun:test";
import {
  isOwn,
  keyOf,
  repoOf,
  repoOfSpec,
} from "../../../src/plugins/claudetto/slices/policy/domain/remote.ts";

test("`repoOf` reads an https URL, an ssh URL, and an scp-like URL", () => {
  const want = { host: "github.com", owner: "them", name: "app" };
  expect(repoOf("https://github.com/them/app.git")).toEqual(want);
  expect(repoOf("ssh://git@github.com/them/app.git")).toEqual(want);
  expect(repoOf("git@github.com:them/app.git")).toEqual(want);
});

test("`repoOf` gives `undefined` for text that is not a remote", () => {
  expect(repoOf("not a url")).toBeUndefined();
});

test("`repoOfSpec` reads `OWNER/REPO` and `HOST/OWNER/REPO`", () => {
  expect(repoOfSpec("them/app")?.host).toBe("github.com");
  expect(repoOfSpec("example.com/them/app")?.host).toBe("example.com");
  expect(repoOfSpec("app")).toBeUndefined();
});

test("`keyOf` is lower case, and `isOwn` compares the owner with the owners", () => {
  const repo = { host: "GitHub.com", owner: "Me", name: "App" };
  expect(keyOf(repo)).toBe("github.com/me/app");
  expect(isOwn(repo, new Set(["me"]))).toBe(true);
  expect(isOwn(repo, new Set(["other", "acme"]))).toBe(false);
  expect(isOwn(repo, new Set())).toBe(false);
  expect(isOwn({ ...repo, owner: "" }, new Set([""]))).toBe(false);
});
