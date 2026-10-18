// Behavior of the lint rule `tools/lint/prose-in-code.grit`,
// with the `biome.json` of the repository in a copy under `TMPDIR`.
// The rule counts characters, not words, so a text in each written language gets the same result.
// The tests pin the grit copies of `CODE_TEXT_MAX_CHARS` (`tools/limits.ts`).

import { beforeAll, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { CODE_TEXT_MAX_CHARS } from "../../tools/limits.ts";
import { REPO, tmpDir } from "./repo.ts";

const MAX = CODE_TEXT_MAX_CHARS;
const SLICE = "src/plugins/x/slices/y";

/** A Japanese text of `n` characters with no spaces, which is three bytes for each character in UTF-8. */
const japanese = (n: number): string => "日本語の文".repeat(n).slice(0, n);

/** The two characters `${` as text. */
const OPEN = ["$", "{"].join("");

/** A template text with `n` fixed characters, cut by a value after each tenth character, and by a value with `{}` inside it. */
const cut = (n: number): string =>
  `${OPEN}{ ...v }.w}${"x".repeat(n).replace(/x{10}/g, `$&${OPEN}v.w}`)}`;

/** Each fixture file, by its path in the copy. */
const FILES: Record<string, string> = {
  [`${SLICE}/domain/at-max.ts`]: `export const a = "${"x".repeat(MAX)}";\n`,
  [`${SLICE}/domain/over-max.ts`]: `export const a = "${"x".repeat(MAX + 1)}";\n`,
  [`${SLICE}/adapters/japanese-at-max.ts`]: `export const a = "${japanese(MAX)}";\n`,
  [`${SLICE}/adapters/japanese-over-max.ts`]: `export const a = "${japanese(MAX + 1)}";\n`,
  [`${SLICE}/domain/chunk-at-max.ts`]: `export const a = (v: string) => \`${"x".repeat(MAX)}\${v}\`;\n`,
  [`${SLICE}/domain/chunk-over-max.ts`]: `export const a = (v: string) => \`${"x".repeat(MAX + 1)}\${v}\`;\n`,
  [`${SLICE}/domain/cut-at-max.ts`]: `export const a = (v: { w: string }) => \`${cut(MAX)}\`;\n`,
  [`${SLICE}/domain/cut-over-max.ts`]: `export const a = (v: { w: string }) => \`${cut(MAX + 1)}\`;\n`,
  [`${SLICE}/domain/dollar-at-max.ts`]: `export const a = (v: { w: string }) => \`${`$${OPEN}v.w}`.repeat(20)}${"x".repeat(MAX - 20)}\`;\n`,
  [`${SLICE}/domain/dollar-over-max.ts`]: `export const a = (v: { w: string }) => \`${`$${OPEN}v.w}`.repeat(20)}${"x".repeat(MAX - 19)}\`;\n`,
  [`${SLICE}/domain/nested-at-max.ts`]: `export const a = (f: (o: object) => string) => \`${"x".repeat(MAX)}${OPEN}f({ a: { b: \`${"x".repeat(MAX)}\` } })}\`;\n`,
  [`${SLICE}/domain/nested-over-max.ts`]: `export const a = (f: (o: object) => string) => \`x${OPEN}f({ a: { b: \`${"x".repeat(MAX + 1)}\` } })}\`;\n`,
  [`${SLICE}/domain/contract.ts`]: [
    `export const one = { ladder: "${"x".repeat(MAX + 1)}" };`,
    `export const two = { evals: { allow: "${"x".repeat(MAX + 1)}" } };`,
    "",
  ].join("\n"),
  [`${SLICE}/domain/ignored.ts`]: `// biome-ignore lint/plugin: data\nexport const a = "${"x".repeat(MAX + 1)}";\n`,
  [`${SLICE}/slice.ts`]: [
    `export const one = { description: "${"x".repeat(MAX + 1)}" };`,
    `export const two = { description: "${"x".repeat(MAX)}" };`,
    `export const three = { other: "${"x".repeat(MAX + 1)}" };`,
    `export const four = (v: { w: string }) => ({ description: \`${cut(MAX + 1)}\` });`,
    `export const five = (v: { w: string }) => ({ description: \`${cut(MAX)}\` });`,
    `export const six = { ladder: "${"x".repeat(MAX + 1)}" };`,
    `export const seven = { evals: { allow: "${"x".repeat(MAX + 1)}" } };`,
    "",
  ].join("\n"),
};

/** The lines of the `plugin` diagnostics of each fixture file. */
let hits: Record<string, number[]> = {};

beforeAll(async () => {
  const dir = tmpDir("prose-in-code");
  const config = await Bun.file(path.join(REPO, "biome.json")).json();
  // The copy is not a git checkout.
  config.vcs.enabled = false;
  await Bun.write(path.join(dir, "biome.json"), JSON.stringify(config));
  // `biome.json` names each plugin of `tools/lint/`.
  for (const name of fs.readdirSync(path.join(REPO, "tools", "lint")))
    await Bun.write(
      path.join(dir, "tools", "lint", name),
      Bun.file(path.join(REPO, "tools", "lint", name)),
    );
  for (const [file, text] of Object.entries(FILES))
    await Bun.write(path.join(dir, file), text);
  const run = Bun.spawn(
    [
      process.execPath,
      "--bun",
      path.join(REPO, "node_modules", ".bin", "biome"),
      "lint",
      "--reporter=json",
      "--max-diagnostics=none",
      "src",
    ],
    { cwd: dir, stdout: "pipe", stderr: "pipe" },
  );
  const [out, err] = await Promise.all([
    new Response(run.stdout).text(),
    new Response(run.stderr).text(),
    run.exited,
  ]);
  if (!out) throw new Error(`biome lint: ${err}`);
  const report = JSON.parse(out) as {
    diagnostics: {
      category: string;
      location: { path: string; start: { line: number } };
    }[];
  };
  hits = {};
  for (const d of report.diagnostics.filter((d) => d.category === "plugin"))
    hits[d.location.path] = [
      ...(hits[d.location.path] ?? []),
      d.location.start.line,
    ];
}, 30_000);

const linesOf = (file: string): number[] => hits[`${SLICE}/${file}`] ?? [];

test("a string literal in `domain/` with `CODE_TEXT_MAX_CHARS` characters passes, and one more character is flagged", () => {
  expect(linesOf("domain/at-max.ts")).toEqual([]);
  expect(linesOf("domain/over-max.ts")).toEqual([1]);
});

test("a Japanese text with no spaces in `adapters/` is flagged by its count of characters, not of bytes", () => {
  expect(linesOf("adapters/japanese-at-max.ts")).toEqual([]);
  expect(linesOf("adapters/japanese-over-max.ts")).toEqual([1]);
});

test("a fixed part of a template literal is flagged above `CODE_TEXT_MAX_CHARS` characters", () => {
  expect(linesOf("domain/chunk-at-max.ts")).toEqual([]);
  expect(linesOf("domain/chunk-over-max.ts")).toEqual([1]);
});

test("a template literal that values cut into short parts is flagged by the sum of its fixed characters", () => {
  expect(linesOf("domain/cut-at-max.ts")).toEqual([]);
  expect(linesOf("domain/cut-over-max.ts")).toEqual([1]);
});

test("a `$` just before a value, as in a price, counts as one character, and the value counts as none", () => {
  expect(linesOf("domain/dollar-at-max.ts")).toEqual([]);
  expect(linesOf("domain/dollar-over-max.ts")).toEqual([1]);
});

test("a template literal in an object in a value of a template literal is a text of its own, and its parts do not add to the outer text", () => {
  expect(linesOf("domain/nested-at-max.ts")).toEqual([]);
  expect(linesOf("domain/nested-over-max.ts")).toEqual([1]);
});

test("a `biome-ignore lint/plugin` comment stops the diagnostic", () => {
  expect(linesOf("domain/ignored.ts")).toEqual([]);
});

test("in `slice.ts`, a text above `CODE_TEXT_MAX_CHARS` characters is flagged, except in a `ladder` or an `evals` field", () => {
  expect(linesOf("slice.ts")).toEqual([1, 3, 4]);
});

test("outside `slice.ts`, a `ladder` or an `evals` field is flagged as any other text", () => {
  expect(linesOf("domain/contract.ts")).toEqual([1, 2]);
});
