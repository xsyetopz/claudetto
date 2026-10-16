// What a script or a recipe runs decides whether it is a check, and the name decides only for a documented entry name.
// A name in any language gives the same result as an English name.

import { expect, test } from "bun:test";
import {
  isCheck,
  type Runnable,
} from "../../../src/plugins/claudetto/slices/asks/domain/checkcmd.ts";
import {
  checkRecipeChanged,
  checkScriptChanged,
} from "../../../src/plugins/claudetto/slices/asks/domain/content.ts";
import {
  isIgnoreKey,
  isThresholdKey,
} from "../../../src/plugins/claudetto/slices/asks/domain/keys.ts";

/** The change of an edit of the file `before` that replaces `old` with `now`. */
const change = (before: string, old: string, now: string) => ({
  file: "/w/f",
  before,
  after: before.replace(old, now),
  fragment: now,
  large: false,
});

const finder = (scripts: Record<string, string>) => (n: string) =>
  n in scripts
    ? ({ text: scripts[n] as string, needs: [] } as Runnable)
    : undefined;

test("a script is a check by what it runs, in any language of its name", () => {
  const scripts = {
    sprawdz: "eslint .",
    テスト: "bun test",
    prüfen: "npm run sprawdz",
    typy: "tsc --noEmit",
    zbuduj: "tsc",
    deploy: "scp a b",
  };
  const find = finder(scripts);
  expect(isCheck("sprawdz", find)).toBe(true);
  expect(isCheck("テスト", find)).toBe(true);
  expect(isCheck("prüfen", find)).toBe(true);
  expect(isCheck("typy", find)).toBe(true);
  expect(isCheck("zbuduj", find)).toBe(false);
  expect(isCheck("deploy", find)).toBe(false);
});

test("a script is a check when it runs the type check of Bun 1.4.3", () => {
  // Bun 1.4.3 ships `bun check` and `--check` (https://bun.com/blog/bun-v1.4.3).
  const find = finder({
    a: "bun check",
    b: "bun test --check",
    c: "bun run --check src/main.ts",
    d: "bun build --check src/main.ts --outdir out",
    e: "node --check x.js",
    f: "bun run build",
  });
  for (const name of ["a", "b", "c", "d"])
    expect(isCheck(name, find)).toBe(true);
  expect(isCheck("e", find)).toBe(false);
  expect(isCheck("f", find)).toBe(false);
});

test("a name that only contains a word like `test` or `lint` is not a check", () => {
  const find = finder({ latest: "echo hi", "lint-staged-cache": "rm -rf c" });
  expect(isCheck("latest", find)).toBe(false);
  expect(isCheck("lint-staged-cache", find)).toBe(false);
  expect(isCheck("test", find)).toBe(true);
});

test("a recipe loop does not hang", () => {
  const find = finder({ a: "just b", b: "just a" });
  expect(isCheck("a", find)).toBe(false);
});

test("an edit of a script in `package.json` that runs a check asks, with a name in Polish", () => {
  const pkg = '{"scripts":{"sprawdz":"eslint .","zbuduj":"tsc"}}';
  expect(checkScriptChanged(change(pkg, "eslint .", "true"))).toBe("sprawdz");
  expect(checkScriptChanged(change(pkg, '"tsc"', '"swc"'))).toBeUndefined();
});

test("an edit of a recipe that runs a check asks, with a name in Japanese", () => {
  const just = "ビルド:\n  cc a.c\n\n検査:\n  pytest\n";
  expect(checkRecipeChanged(change(just, "pytest", "true"))).toBe("検査");
  expect(
    checkRecipeChanged(change(just, "cc a.c", "cc -O2 a.c")),
  ).toBeUndefined();
});

test("config keys match by the documented name and never by a part of a name", () => {
  expect(isThresholdKey("fail_under")).toBe(true);
  expect(isThresholdKey("fail-under")).toBe(true);
  expect(isThresholdKey('"lines"')).toBe(true);
  expect(isThresholdKey("minimumFontSize")).toBe(false);
  expect(isThresholdKey("coverageDirectory")).toBe(false);
  expect(isIgnoreKey("extend-ignore")).toBe(true);
  expect(isIgnoreKey("per-file-ignores")).toBe(true);
  expect(isIgnoreKey("ignoreme")).toBe(false);
  expect(isIgnoreKey("allowance")).toBe(false);
});
