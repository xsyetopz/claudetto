// The schema script scans a bundle string, so the tests run it on fixtures.
// The shipped schemas and the dotclaude settings templates are checked against each other.

import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  buildSchemas,
  chainCalls,
  findSchemaBody,
  isManagedOnly,
  matchClose,
  parseEntries,
  schemaFiles,
  skipToken,
  splitTop,
  unquote,
} from "../../tools/schema.mjs";

const REPO = path.join(import.meta.dirname, "../..");
const VERSION = "2.1.295";
const RAW = "https://raw.githubusercontent.com/xsyetopz/dotclaude/main/schemas";
const shipped = (kind) =>
  JSON.parse(
    fs.readFileSync(path.join(REPO, "schemas", schemaFiles()[kind]), "utf8"),
  );

// The errors of `value` against `schema`, one string each, with the path and the key name.
// It knows the keywords that the generated schemas use.
function validate(value, schema, at = "") {
  const where = at || "(root)";
  const types = {
    string: (v) => typeof v === "string",
    boolean: (v) => typeof v === "boolean",
    number: (v) => typeof v === "number",
    integer: (v) => Number.isInteger(v),
    array: Array.isArray,
    object: (v) => v !== null && typeof v === "object" && !Array.isArray(v),
  };
  if (schema.type && !types[schema.type](value))
    return [`${where}: expected ${schema.type}`];
  if ("const" in schema && value !== schema.const)
    return [`${where}: expected ${JSON.stringify(schema.const)}`];
  if (schema.enum && !schema.enum.includes(value))
    return [`${where}: ${JSON.stringify(value)} is not one of ${schema.enum}`];
  if (schema.minimum !== undefined && value < schema.minimum)
    return [`${where}: below ${schema.minimum}`];
  if (schema.type === "array" && schema.items)
    return value.flatMap((v, i) => validate(v, schema.items, `${at}[${i}]`));
  if (schema.type !== "object") return [];
  const errors = [];
  for (const key of schema.required ?? [])
    if (!(key in value)) errors.push(`${where}: missing key "${key}"`);
  for (const [key, sub] of Object.entries(value)) {
    const child = at ? `${at}.${key}` : key;
    if (schema.properties?.[key])
      errors.push(...validate(sub, schema.properties[key], child));
    else if (schema.additionalProperties === false)
      errors.push(`${where}: unknown key "${key}"`);
    else if (typeof schema.additionalProperties === "object")
      errors.push(...validate(sub, schema.additionalProperties, child));
  }
  return errors;
}

// The fixture uses the helper names of 2.1.293.
const FIXTURE = [
  'var x=/}"{/.test(a);',
  'function ya(e){return u({allow:A(o()).optional().describe("Allowed rules"),mode:W(["a","b"]).optional()}).passthrough()}',
  'var Z=f(()=>u({enabled:H().optional().describe("Run in the sandbox"),',
  'level:v().int().min(1).optional().describe("Level")}));',
  'const s={$schema:()=>o().optional().describe("Schema `ref` {x}"),',
  'model:()=>o().optional().describe("A \\u2014 "+Q+"b"),',
  'permissions:()=>Ae(()=>ya(e)).describe("Permissions"),',
  "sandbox:()=>Ae(()=>Z()),",
  'polOnly:()=>H().optional().describe("Only honored from managed settings."),',
  `pat:()=>o().optional().describe(\`t $\{a} }\`),re:()=>o().optional().describe("r"),`,
  '...!1,...flag&&{gated:()=>H().optional().describe("Gated key")},',
  "...Qr(Xi(e),(i)=>()=>i)};",
].join("");

test("the scanner skips braces inside strings, templates, and regex literals", () => {
  const dollar = "$";
  const tpl = `\`}${dollar}{"}"}\``;
  const src = `{a:"}",b:${tpl},c:/}/,d:[1,2]}`;
  expect(matchClose(src, 0)).toBe(src.length - 1);
  expect(splitTop(src.slice(1, -1))).toEqual([
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
  expect(calls).toEqual([
    ["int", ""],
    ["min", "1"],
    ["describe", '"x, y"'],
  ]);
});

test("the fixture gives its keys, nested keys, and managed-only keys", () => {
  const body = findSchemaBody(FIXTURE);
  expect(parseEntries(body, true).map(([k]) => k)).toEqual([
    "$schema",
    "model",
    "permissions",
    "sandbox",
    "polOnly",
    "pat",
    "re",
    "gated",
  ]);
  const { user, managed } = buildSchemas(FIXTURE, "2.1.293");
  expect(managed.properties.model.description).toBe("A \u2014 b");
  expect(managed.properties.permissions.properties.allow.type).toBe("array");
  expect(managed.properties.permissions.properties.mode.enum).toEqual([
    "a",
    "b",
  ]);
  expect(managed.properties.sandbox.properties.level).toMatchObject({
    type: "integer",
    minimum: 1,
  });
  expect(managed.properties.polOnly["x-managed-only"]).toBe(true);
  expect(user.properties.polOnly).toBeUndefined();
  expect(validate({ polOnly: true }, user)).toEqual([
    '(root): unknown key "polOnly"',
  ]);
  expect(validate({ polOnly: true }, managed)).toEqual([]);
});

test("a bundle without the schema fails with the version and writes no file", () => {
  expect(() => buildSchemas("var a=1;", VERSION)).toThrow(VERSION);
  expect(() => buildSchemas(FIXTURE, "0.0.1")).toThrow("0.0.1");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "schema-test-"));
  try {
    const bundle = path.join(dir, "bundle.js");
    const out = path.join(dir, "out");
    fs.writeFileSync(bundle, "var a=1;", "latin1");
    const run = spawnSync(
      process.execPath,
      [
        "--no-env-file",
        path.join(REPO, "tools/schema.mjs"),
        "--bundle",
        bundle,
        "--version",
        VERSION,
        "--out",
        out,
      ],
      { encoding: "utf8" },
    );
    expect(run.status).not.toBe(0);
    expect(run.stderr).toContain(VERSION);
    expect(fs.existsSync(out)).toBe(false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("the shipped schema has the keys of `2.1.295` with their descriptions", () => {
  const { properties } = shipped("managed");
  expect(Object.keys(properties).length).toBe(184);
  for (const key of [
    "syncClaudeAiSkills",
    "syncClaudeAiPlugins",
    "prependPlugins",
    "appendPlugins",
    "skillOverrides",
    "disableClaudeAiConnectors",
  ])
    expect(properties[key].description).toBeTruthy();
});

test("a build that reuses short names takes the last definition before the schema", () => {
  const bundle = [
    'var a=p(()=>u({type:T("tombstone")}));',
    "var b=1;",
    "var Z=p(()=>u({early:H()}));",
    "var Y=p(()=>wrap(C(o())));",
    "var Z=p(()=>u({late:H().optional()}));",
    "const s={$schema:()=>o().optional(),",
    "keep:()=>Ae(()=>Z()),",
    "wrapped:()=>Ae(()=>Y()),};",
    "var Y=p(()=>u({after:H()}));",
  ].join("");
  const { user } = buildSchemas(bundle, "2.1.295");
  expect(Object.keys(user.properties.keep.properties)).toEqual(["late"]);
  expect(user.properties.wrapped).toEqual({});
});

test("`forceLoginGatewayUrl` is a user key and not managed-only", () => {
  const user = shipped("user").properties;
  const managed = shipped("managed").properties;
  expect(user.forceLoginGatewayUrl.type).toBe("string");
  expect(managed.forceLoginGatewayUrl["x-managed-only"]).toBeUndefined();
  expect(isManagedOnly(user.forceLoginGatewayUrl.description)).toBe(false);
  expect(user.forceLoginMethod).toBeDefined();
});

test("`isManagedOnly` reads the admin-controlled text of 2.1.294 and 2.1.295", () => {
  const managed =
    "Cloud gateway URL to pre-fill. Honored only from admin-controlled managed settings (MDM / managed-settings.json / policy helper).";
  const both =
    "Cloud gateway URL to pre-fill. Honored from admin-controlled managed settings (MDM / managed-settings.json / policy helper) and, on a machine with none of those, from your own user settings.";
  expect(isManagedOnly(managed)).toBe(true);
  expect(isManagedOnly(both)).toBe(false);
});

test("the shipped schema has nested keys, and marks the managed-only keys", () => {
  const user = shipped("user").properties;
  const managed = shipped("managed").properties;
  expect(user.sandbox.properties.allowUnsandboxedCommands.type).toBe("boolean");
  expect(user.statusLine.properties.refreshInterval.minimum).toBe(1);
  expect(user.permissions.properties.defaultMode).toBeDefined();
  expect(user.env.type).toBe("object");
  expect(managed.prependPlugins["x-managed-only"]).toBe(true);
  expect(
    managed.sandbox.properties.network.properties.allowManagedDomainsOnly[
      "x-managed-only"
    ],
  ).toBe(true);
  expect(user.prependPlugins).toBeUndefined();
  expect(
    user.sandbox.properties.network.properties.allowManagedDomainsOnly,
  ).toBeUndefined();
});

for (const [file, kind] of [["features/setup/profile.json", "user"]]) {
  const template = JSON.parse(
    fs.readFileSync(path.join(REPO, "plugins/dotclaude", file), "utf8"),
  );
  test(`\`${file}\` points to its schema and has only keys that the schema has`, () => {
    expect(template.$schema).toBe(`${RAW}/${schemaFiles()[kind]}`);
    expect(shipped(kind)["x-claude-code-version"]).toBe(VERSION);
    expect(validate(template, shipped(kind))).toEqual([]);
  });
  test(`an unknown key in \`${file}\` fails and the failure names the key`, () => {
    const bad = { ...template, notAClaudeKey: true };
    expect(validate(bad, shipped(kind))).toEqual([
      '(root): unknown key "notAClaudeKey"',
    ]);
  });
}

test("a managed-only key in the user template fails", () => {
  const template = JSON.parse(
    fs.readFileSync(
      path.join(REPO, "plugins/dotclaude/features/setup/profile.json"),
      "utf8",
    ),
  );
  expect(
    validate({ ...template, prependPlugins: [] }, shipped("user")),
  ).toEqual(['(root): unknown key "prependPlugins"']);
});
