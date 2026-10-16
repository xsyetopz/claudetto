// The rules of the package ask: the packages that a command adds, the lockfile match, and the answer of the registry.
// No command runs and no request goes out.

import { expect, test } from "bun:test";
import {
  addedPackages,
  mentions,
  registryAnswer,
  registryName,
  registryUrl,
} from "../../../src/plugins/claudetto/slices/repostate/domain/packages.ts";

const names = (command: string) =>
  addedPackages(command).flatMap((a) => a.names);

test("each package manager has its own word for an add", () => {
  expect(names("bun add a-pkg")).toEqual(["a-pkg"]);
  expect(names("npm install a-pkg")).toEqual(["a-pkg"]);
  expect(names("npm i a-pkg")).toEqual(["a-pkg"]);
  expect(names("pnpm add -D a-pkg")).toEqual(["a-pkg"]);
  expect(names("yarn add a-pkg b-pkg")).toEqual(["a-pkg", "b-pkg"]);
});

test("a command that adds no package gives nothing", () => {
  for (const c of [
    "npm install",
    "bun install",
    "git add x",
    "yarn install",
    "npm run add x",
    "ls",
  ])
    expect(names(c), c).toEqual([]);
});

test("a wrapper and a chain are parsed", () => {
  expect(names("cd app && sudo bun add a-pkg")).toEqual(["a-pkg"]);
  expect(names("echo 'bun add a-pkg'")).toEqual([]);
});

test("a version tag is cut, and a scope is kept", () => {
  expect(registryName("eslint@9")).toBe("eslint");
  expect(registryName("@biomejs/biome@2.0.0")).toBe("@biomejs/biome");
});

test("a path, a URL, and a `user/repo` form are no registry name", () => {
  for (const s of [
    "./local",
    "../x",
    "https://x.io/a.tgz",
    "user/repo",
    "file:../x",
    "npm:other@1",
  ])
    expect(registryName(s), s).toBeNull();
});

test("`mentions` matches a whole name only", () => {
  expect(mentions('"left-padx": "1.0.0"', "left-padx")).toBe(true);
  expect(mentions('"left-padx-extra": "1"', "left-padx")).toBe(false);
  expect(mentions("x/left-padx", "left-padx")).toBe(true);
});

test("the registry URL escapes the slash of a scope", () => {
  expect(registryUrl("a")).toBe("https://registry.npmjs.org/a");
  expect(registryUrl("@s/a")).toBe("https://registry.npmjs.org/@s%2Fa");
});

test("only 404 and 410 say that a package is missing", () => {
  expect(registryAnswer(200)).toBe("exists");
  expect(registryAnswer(404)).toBe("missing");
  expect(registryAnswer(410)).toBe("missing");
  expect(registryAnswer(500)).toBe("unknown");
  expect(registryAnswer(429)).toBe("unknown");
});
