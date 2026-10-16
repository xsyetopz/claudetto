// A runner call such as `bunx eslint` in a project with no local `eslint` downloads the check tool and checks nothing of the project.
// A download of a tool that is not a check, such as `npx create-vite`, gets no ask.
// For `tsc`, the ask states the installed `bun --version` as a fact.
// The ask stays silent when the project has the tool in `node_modules`.

import { expect, test } from "bun:test";
import {
  atLeast,
  downloadReason,
  type Facts,
} from "../../../src/plugins/claudetto/slices/asks/domain/download.ts";

const facts = (files: string[], bun: string | null): Facts => ({
  exists: async (file) => files.includes(file),
  bunVersion: async () => bun,
});

test("`bunx tsc` with no local `tsc` and `bun` 1.4.3 names `bun check` and the version", async () => {
  const out = await downloadReason(
    "bunx tsc --noEmit -p .",
    "/p",
    facts(["/p/tsconfig.json"], "1.4.3\n"),
  );
  expect(out).toContain("`bun check`");
  expect(out).toContain("1.4.3");
  expect(out).toContain("`tsconfig.json`");
});

test("each download form of `tsc` asks", async () => {
  for (const command of [
    "npx tsc --noEmit",
    "npx --yes tsc",
    "npx -p typescript tsc --noEmit",
    "pnpm dlx tsc",
    "yarn dlx tsc",
    "bun x tsc",
    "npm exec tsc",
    "cd app && bunx tsc",
  ])
    expect(await downloadReason(command, "/p", facts([], "1.4.3"))).not.toBe(
      null,
    );
});

test("an old `bun`, or none, gets the text that does not name `bun check`", async () => {
  for (const bun of ["1.3.9", null]) {
    const out = await downloadReason("bunx tsc", "/p", facts([], bun));
    expect(out).not.toBe(null);
    expect(out).not.toContain("bun check");
  }
});

test("a local tool, a local path, and a command that is no runner call give no ask", async () => {
  const local = facts(
    [
      "/p/node_modules/.bin/tsc",
      "/p/node_modules/.bin/eslint",
      "/p/node_modules/@biomejs/biome/package.json",
    ],
    "1.4.3",
  );
  for (const command of [
    "bunx tsc",
    "npx eslint .",
    "npx eslint@9 .",
    "bunx @biomejs/biome ci",
    "npx -p @biomejs/biome biome ci",
    "bunx ./tools/check.ts",
    "npx -p ./tools/eslint eslint .",
    "npx -c 'eslint .'",
    "bun check",
    "bun run lint",
  ])
    expect(await downloadReason(command, "/p", local)).toBe(null);
});

test("a tool that the project does not have asks, and the reason names it", async () => {
  const none = facts([], "1.4.3");
  const cases: [string, string][] = [
    ["bunx eslint .", "`eslint`"],
    ["npx eslint@9 .", "`eslint`"],
    ["bunx @biomejs/biome ci", "`@biomejs/biome`"],
    ["npx -p @biomejs/biome biome ci", "`biome`"],
    ["npx --package=eslint eslint .", "`eslint`"],
    ["cd app && pnpm dlx oxlint", "`oxlint`"],
  ];
  for (const [command, name] of cases) {
    const out = await downloadReason(command, "/p", none);
    expect(out).toContain(name);
    expect(out).not.toContain("bun check");
  }
});

test("with `-p`, each named package must be local, and a local program is not enough", async () => {
  const command = "npx -p eslint-plugin-x -p eslint eslint .";
  const bin = facts(["/p/node_modules/.bin/eslint"], "1.4.3");
  expect(await downloadReason(command, "/p", bin)).toContain("`eslint`");
  const both = facts(
    [
      "/p/node_modules/eslint/package.json",
      "/p/node_modules/eslint-plugin-x/package.json",
    ],
    "1.4.3",
  );
  expect(await downloadReason(command, "/p", both)).toBe(null);
});

test("a download of a tool that is not a check gives no ask", async () => {
  const none = facts([], "1.4.3");
  for (const command of [
    "npx create-vite app",
    "bunx cowsay hi",
    "CTX7_TELEMETRY_DISABLED=1 bunx -y ctx7@0.6.1 docs /oven-sh/bun test",
    "npx -p @biomejs/biome biome format --write .",
  ])
    expect(await downloadReason(command, "/p", none)).toBe(null);
});

test("the version check compares numbers and not text", () => {
  expect(atLeast("1.10.0", "1.4.3")).toBe(true);
  expect(atLeast("1.4.2", "1.4.3")).toBe(false);
  expect(atLeast("v1.4.3", "1.4.3")).toBe(false);
  expect(atLeast("", "1.4.3")).toBe(false);
});
