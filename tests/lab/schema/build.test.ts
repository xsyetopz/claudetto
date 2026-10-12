// The schema script scans a bundle string, so the tests run it on fixtures.

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import {
  buildSchemas,
  schemaFiles,
} from "../../../src/plugins/dotclaude-lab/slices/schema/domain/build.ts";
import { fallbackOf } from "../../../src/plugins/dotclaude-lab/slices/schema/domain/descriptions.ts";
import { isManagedOnly } from "../../../src/plugins/dotclaude-lab/slices/schema/domain/managed.ts";
import type { Schema } from "../../../src/plugins/dotclaude-lab/slices/schema/domain/model.ts";
import {
  chainCalls,
  findSchemaBody,
  matchClose,
  parseEntries,
  skipToken,
  splitTop,
  unquote,
} from "../../../src/plugins/dotclaude-lab/slices/schema/domain/scan.ts";
import { REPO, tmpDir } from "../../support/repo.ts";
import { validate } from "../../support/validate.ts";
import { spawnText } from "../fixture-repo.ts";

const VERSION = "2.1.296";
const shipped = async (kind: "user" | "managed") =>
  JSON.parse(
    await Bun.file(path.join(REPO, "schemas", schemaFiles()[kind])).text(),
  ) as Schema;

type Props = Record<string, Schema>;

// The `properties` of a schema node. A node without `properties` gives `undefined` at run time, as a plain read does.
const props = (node: Schema | undefined) => node?.properties as Props;

// The node at a path of property names, so `at(s, "a", "b")` reads `s.properties.a.properties.b`.
function at(node: Schema | undefined, ...keys: string[]): Schema {
  let found = node;
  for (const key of keys) found = props(found)[key];
  return found as Schema;
}

// The fixture uses the helper names of the supported version.
const FIXTURE = [
  'var x=/}"{/.test(a);',
  'function ya(e){return u({allow:A(o()).optional().describe("Allowed rules"),mode:U(["a","b"]).optional()}).passthrough()}',
  'var Z=f(()=>u({enabled:H().optional().describe("Run in the sandbox"),',
  'level:v().int().min(1).optional().describe("Level")}));',
  'const s={$schema:()=>o().optional().describe("Schema `ref` {x}"),',
  'model:()=>o().optional().describe("A \\u2014 "+Q+"b"),',
  'permissions:()=>Ae(()=>ya(e)).describe("Permissions"),',
  "sandbox:()=>Ae(()=>Z()),",
  'polOnly:()=>H().optional().describe("Only honored from managed settings."),',
  `pat:()=>o().optional().describe("t \${a} }"),re:()=>o().optional().describe("r"),`,
  '...!1,...flag&&{gated:()=>H().optional().describe("Gated key")},',
  "...Qr(Xi(e),(i)=>()=>i)};",
].join("");

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

test("a bundle without the schema fails with the version and writes no file", async () => {
  expect(() => buildSchemas("var a=1;", VERSION)).toThrow(
    new RegExp(VERSION.replaceAll(".", "\\.")),
  );
  expect(() => buildSchemas(FIXTURE, "0.0.1")).toThrow(/0\.0\.1/);
  const dir = tmpDir("schema-test");
  try {
    const bundle = path.join(dir, "bundle.js");
    const out = path.join(dir, "out");
    await Bun.write(bundle, "var a=1;");
    const run = spawnText(process.execPath, [
      path.join(REPO, "plugins/dotclaude-lab/bin/dotclaude-schema"),
      "--bundle",
      bundle,
      "--version",
      VERSION,
      "--out",
      out,
    ]);
    expect(run.status).not.toBe(0);
    expect(run.stderr.includes(VERSION), run.stderr).toBeTruthy();
    expect(fs.existsSync(out)).toBe(false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
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
    'var a=p(()=>u({type:C("tombstone")}));',
    "var b=1;",
    "var Z=p(()=>u({early:H()}));",
    "var Y=p(()=>wrap(A(o())));",
    "var Z=p(()=>u({late:H().optional()}));",
    'const s={$schema:()=>o().optional().describe("Schema"),',
    'keep:()=>Ae(()=>Z()).describe("Keep"),',
    'wrapped:()=>Ae(()=>Y()).describe("Wrapped"),};',
    "var Y=p(()=>u({after:H()}));",
  ].join("");
  const { user } = buildSchemas(bundle, VERSION);
  expect(Object.keys(props(at(user, "keep")))).toStrictEqual(["late"]);
  expect(at(user, "wrapped")).toStrictEqual({ description: "Wrapped" });
});

test("a lazy reference to a record helper gives an object", () => {
  const bundle = [
    "var E=p(()=>ue(o(),o()));",
    'const s={$schema:()=>o().optional().describe("Schema"),',
    'env:()=>Ae(()=>E()).describe("Env"),};',
  ].join("");
  const { user } = buildSchemas(bundle, VERSION);
  expect(at(user, "env")).toStrictEqual({
    type: "object",
    additionalProperties: { type: "string" },
    description: "Env",
  });
});

test("`forceLoginGatewayUrl` is a user key and not managed-only", async () => {
  const user = await shipped("user");
  const managed = await shipped("managed");
  expect(at(user, "forceLoginGatewayUrl").type).toBe("string");
  expect(at(managed, "forceLoginGatewayUrl")["x-managed-only"]).toBe(undefined);
  expect(isManagedOnly(at(user, "forceLoginGatewayUrl").description)).toBe(
    false,
  );
  expect(at(user, "forceLoginMethod")).not.toBe(undefined);
});

test("each schema names the version in a root `$comment` and has no `x-claude-code-version`", () => {
  const { user, managed } = buildSchemas(FIXTURE, VERSION);
  for (const schema of [user, managed]) {
    expect(schema["$comment"]).toBe(`Extracted from Claude Code ${VERSION}`);
    expect("x-claude-code-version" in schema).toBe(false);
  }
});

test("each shipped schema file names a Claude Code version in the root `$comment`, with no `x-claude-code-version`", async () => {
  for (const name of Object.values(schemaFiles())) {
    const schema = JSON.parse(
      await Bun.file(path.join(REPO, "schemas", name)).text(),
    ) as Schema;
    expect(schema["$comment"]).toMatch(
      /^Extracted from Claude Code \d+\.\d+\.\d+$/,
    );
    expect("x-claude-code-version" in schema).toBe(false);
  }
});

test("`isManagedOnly` reads the admin-controlled text", () => {
  const managed =
    "Cloud gateway URL to pre-fill. Honored only from admin-controlled managed settings (MDM / managed-settings.json / policy helper).";
  const both =
    "Cloud gateway URL to pre-fill. Honored from admin-controlled managed settings (MDM / managed-settings.json / policy helper) and, on a machine with none of those, from your own user settings.";
  expect(isManagedOnly(managed)).toBe(true);
  expect(isManagedOnly(both)).toBe(false);
});

test("the shipped schema has nested keys, and marks the managed-only keys", async () => {
  const user = await shipped("user");
  const managed = await shipped("managed");
  expect(at(user, "sandbox", "allowUnsandboxedCommands").type).toBe("boolean");
  expect(at(user, "statusLine", "refreshInterval")["minimum"]).toBe(1);
  expect(at(user, "permissions", "defaultMode")).not.toBe(undefined);
  expect(at(user, "env").type).toBe("object");
  expect(at(managed, "prependPlugins")["x-managed-only"]).toBe(true);
  expect(
    at(managed, "sandbox", "network", "allowManagedDomainsOnly")[
      "x-managed-only"
    ],
  ).toBe(true);
  expect(props(user)["prependPlugins"]).toBe(undefined);
  expect(props(at(user, "sandbox", "network"))["allowManagedDomainsOnly"]).toBe(
    undefined,
  );
});

test.skipIf(process.platform === "win32")(
  "a bundle whose `--version` exits non-zero fails the command and writes no file",
  async () => {
    const dir = tmpDir("schema-test");
    try {
      // The file is a shell script, so `--version` exits 3, and it holds the schema, so the build alone would pass.
      const bundle = path.join(dir, "bundle");
      const out = path.join(dir, "out");
      await Bun.write(bundle, `#!/bin/sh\n# ${FIXTURE}\nexit 3\n`);
      fs.chmodSync(bundle, 0o755);
      const run = spawnText(process.execPath, [
        path.join(REPO, "plugins/dotclaude-lab/bin/dotclaude-schema"),
        "--bundle",
        bundle,
        "--out",
        out,
      ]);
      expect(run.status).not.toBe(0);
      expect(fs.existsSync(out)).toBe(false);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  },
);

test("a managed-only key in the user settings fails", async () => {
  expect(validate({ prependPlugins: [] }, await shipped("user"))).toStrictEqual(
    ['(root): unknown key "prependPlugins"'],
  );
});

test("a key takes its bundle description, else its fallback text, and a key with neither fails", () => {
  const { managed } = buildSchemas(FIXTURE, VERSION);
  // A bundle description wins.
  expect(props(managed)["permissions"]?.description).toBe("Permissions");
  // `sandbox` has no description in the fixture, so `FALLBACK` gives its text.
  expect(props(managed)["sandbox"]?.description).toBe(fallbackOf("sandbox"));
  // A top-level key with no description in the bundle and no fallback fails the build.
  const bare = FIXTURE.replace(
    'describe("Schema `ref` {x}"),',
    'describe("Schema `ref` {x}"),bare:()=>o().optional(),',
  );
  expect(() => buildSchemas(bare, VERSION)).toThrow(/"bare"/);
  // An inherited name is no fallback, so `constructor` fails too.
  const inherited = FIXTURE.replace(
    'describe("Schema `ref` {x}"),',
    'describe("Schema `ref` {x}"),constructor:()=>o().optional(),',
  );
  expect(() => buildSchemas(inherited, VERSION)).toThrow(/"constructor"/);
});
