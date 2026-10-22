// The schema script scans a bundle string, so the tests run it on fixtures.

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { buildSchemas } from "../../../../tools/schema/domain/build.ts";
import {
  chainCalls,
  findSchemaBody,
  matchClose,
  parseEntries,
  skipToken,
  splitTop,
  unquote,
} from "../../../../tools/schema/domain/scan.ts";
import { REPO, tmpDir } from "../../../support/repo.ts";
import { validate } from "../../../support/validate.ts";
import { spawnText } from "../../fixture-repo.ts";
import { at, FIXTURE, HELPERS, props, shipped, VERSION } from "./shared.ts";

test("the scanner skips braces inside strings, templates, and regex literals", () => {
  const dollar = "$";
  const tpl = `\`}${dollar}{"}"}\``;
  const src = `{a:"}",b:${tpl},c:/}/,d:[1,2]}`;
  expect(matchClose(src, 0)).toBe(src.length - 1);
  expect(splitTop(src.slice(1, -1))).toStrictEqual([
    'a:"}"',
    `b:${tpl}`,
    "c:/}/",
    "d:[1,2]",
  ]);
  expect(skipToken("a / b", 2, "a")).toBe(2);
  expect(skipToken("x=/a\\/[/]/g;", 2, "=")).toBe(11);
});

test("`unquote` reads escapes, and `chainCalls` reads a type chain", () => {
  expect(unquote('"a\\u2014b\\n\\"c"')).toBe('a\u2014b\n"c');
  const { head, calls } = chainCalls('v().int().min(1).describe("x, y")');
  expect(head).toBe("v");
  expect(calls).toStrictEqual([
    ["int", ""],
    ["min", "1"],
    ["describe", '"x, y"'],
  ]);
});

test("the fixture gives its keys, nested keys, and managed-only keys", () => {
  const body = findSchemaBody(FIXTURE) as string;
  expect(parseEntries(body, true).map(([k]) => k)).toStrictEqual([
    "$schema",
    "model",
    "permissions",
    "sandbox",
    "polOnly",
    "pat",
    "re",
    "gated",
  ]);
  const { user, managed } = buildSchemas(FIXTURE, VERSION);
  expect(at(managed, "model").description).toBe("A \u2014 b");
  expect(at(managed, "permissions", "allow").type).toBe("array");
  expect(at(managed, "permissions", "mode")["enum"]).toStrictEqual(["a", "b"]);
  expect(at(managed, "sandbox", "level")).toMatchObject({
    type: "integer",
    minimum: 1,
  });
  expect(at(managed, "polOnly")["x-managed-only"]).toBe(true);
  expect(props(user)["polOnly"]).toBe(undefined);
  expect(validate({ polOnly: true }, user)).toStrictEqual([
    '(root): unknown key "polOnly"',
  ]);
  expect(validate({ polOnly: true }, managed)).toStrictEqual([]);
});

/** Runs `tools/schema/main.ts` on a bundle with the text `text`, and checks that it fails and writes no file. Gives the standard error. */
const failsOnBundle = async (text: string): Promise<string> => {
  const dir = tmpDir("schema-test");
  try {
    const bundle = path.join(dir, "bundle.js");
    const out = path.join(dir, "out");
    await Bun.write(bundle, text);
    const run = spawnText(process.execPath, [
      path.join(REPO, "tools/schema/main.ts"),
      "--bundle",
      bundle,
      "--version",
      VERSION,
      "--out",
      out,
    ]);
    expect(run.status).not.toBe(0);
    expect(fs.existsSync(out)).toBe(false);
    return run.stderr;
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
};

test("a bundle without the schema fails with the version and writes no file", async () => {
  expect(() => buildSchemas("var a=1;", VERSION)).toThrow(
    new RegExp(VERSION.replaceAll(".", "\\.")),
  );
  const stderr = await failsOnBundle("var a=1;");
  expect(stderr.includes(VERSION), stderr).toBeTruthy();
});

test("`--version` of a version that is not installed fails with that version and writes no file", () => {
  const dir = tmpDir("schema-test");
  try {
    const out = path.join(dir, "out");
    const run = spawnText(process.execPath, [
      path.join(REPO, "tools/schema/main.ts"),
      "--version",
      "9.9.9",
      "--out",
      out,
    ]);
    expect(run.status).not.toBe(0);
    expect(run.stderr).toContain("9.9.9");
    expect(fs.existsSync(out)).toBe(false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("a bundle without the definitions of its type helpers stops the build and writes no file", async () => {
  expect(await failsOnBundle(FIXTURE.replace(HELPERS, ""))).toContain(
    "no definition of the type helpers",
  );
});

test("a helper resolves in the module that exports it, and not in a later module that reuses its name", () => {
  const bundle = [
    HELPERS.replace("export{o,", "export{o as s0,").replace(
      "import{o,",
      "import{s0 as o,",
    ),
    "// @bun\n",
    'function o(e){return{type:"object"}}',
    "export{o as other};\n",
    "// @bun\n",
    'import{s0 as o,H,u,C,B,A,fe,$e,E}from"/$bunfs/root/chunk-z.js";',
    'function Pe(e){return new W({type:"lazy",getter:e})}',
    'const s={$schema:()=>o().optional().describe("Schema"),};',
  ].join("");
  const { user } = buildSchemas(bundle, VERSION);
  expect(at(user, "$schema")).toStrictEqual({
    type: "string",
    description: "Schema",
  });
});

test("the keys of a gated feature shape come after the other keys, in the order of the features", () => {
  const bundle = [
    HELPERS,
    'var kn={autoMode:{buildGate:()=>!0,shape:()=>({useAutoModeDuringPlan:H().optional().describe("Plan"),autoMode:u({allow:C(o()).optional()}).optional().describe("Rules")})},',
    'voice:{buildGate:()=>!0,shape:()=>({voiceEnabled:H().optional().describe("Voice")})}};',
    'const s={$schema:()=>o().optional().describe("Schema"),...zr(fa(e),(i)=>()=>i)};',
  ].join("");
  const { user } = buildSchemas(bundle, VERSION);
  expect(Object.keys(props(user))).toStrictEqual([
    "$schema",
    "useAutoModeDuringPlan",
    "autoMode",
    "voiceEnabled",
  ]);
  expect(at(user, "useAutoModeDuringPlan")).toStrictEqual({
    type: "boolean",
    description: "Plan",
  });
  expect(at(user, "autoMode", "allow").type).toBe("array");
});

test("the shipped schema keeps the keys that the profile relies on, with descriptions", async () => {
  const managed = await shipped("managed");
  for (const key of [
    "syncClaudeAiSkills",
    "syncClaudeAiPlugins",
    "prependPlugins",
    "appendPlugins",
    "skillOverrides",
    "disableClaudeAiConnectors",
  ])
    expect(at(managed, key).description).toBeTruthy();
});

test("a build that reuses short names takes the last definition before the schema", () => {
  const bundle = [
    HELPERS,
    'var a=p(()=>u({type:A("tombstone")}));',
    "var b=1;",
    "var Z=p(()=>u({early:H()}));",
    "var Y=p(()=>wrap(C(o())));",
    "var Z=p(()=>u({late:H().optional()}));",
    'const s={$schema:()=>o().optional().describe("Schema"),',
    'keep:()=>Pe(()=>Z()).describe("Keep"),',
    'wrapped:()=>Pe(()=>Y()).describe("Wrapped"),};',
    "var Y=p(()=>u({after:H()}));",
  ].join("");
  const { user } = buildSchemas(bundle, VERSION);
  expect(Object.keys(props(at(user, "keep")))).toStrictEqual(["late"]);
  expect(at(user, "wrapped")).toStrictEqual({ description: "Wrapped" });
});

test("a lazy reference to a record helper gives an object", () => {
  const bundle = [
    HELPERS,
    "var R=p(()=>fe(o(),o()));",
    'const s={$schema:()=>o().optional().describe("Schema"),',
    'env:()=>Pe(()=>R()).describe("Env"),};',
  ].join("");
  const { user } = buildSchemas(bundle, VERSION);
  expect(at(user, "env")).toStrictEqual({
    type: "object",
    additionalProperties: { type: "string" },
    description: "Env",
  });
});

test("a lazy reference to an imported helper resolves in the module that exports it", () => {
  // The name `G` is a record in its own module, and the home module only imports it, with no `rec` helper of its own.
  const [lib = "", home = ""] = HELPERS.split(/(?=\/\/ @bun\nimport)/);
  const exporter = [
    "// @bun\n",
    'import{o,C}from"/$bunfs/root/chunk-z.js";',
    'function rec(e,t){return new D({type:"record",keyType:e,valueType:t})}',
    "var G=f(()=>rec(o(),C(o())));",
    "export{G};\n",
  ].join("");
  const bundle = [
    lib,
    exporter,
    home.replace(
      'from"/$bunfs/root/chunk-z.js";',
      'from"/$bunfs/root/chunk-z.js";import{G}from"/$bunfs/root/chunk-a.js";',
    ),
    'const s={$schema:()=>o().optional().describe("Schema"),',
    'hooks:()=>Pe(()=>G()).describe("Hooks"),};',
  ].join("");
  const { user } = buildSchemas(bundle, VERSION);
  expect(at(user, "hooks")).toStrictEqual({
    type: "object",
    additionalProperties: { type: "array", items: { type: "string" } },
    description: "Hooks",
  });
});
