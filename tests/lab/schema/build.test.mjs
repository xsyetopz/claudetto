// The schema script scans a bundle string, so the tests run it on fixtures.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
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
} from "../../../plugins/dotclaude-lab/features/schema/build.mjs";
import { validate } from "../../dotclaude/fixtures/validate.mjs";
import { REPO, tmpDir } from "../../support/repo.mjs";

const VERSION = "2.1.296";
const shipped = (kind) =>
  JSON.parse(
    fs.readFileSync(path.join(REPO, "schemas", schemaFiles()[kind]), "utf8"),
  );

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
  `pat:()=>o().optional().describe(\`t $\{a} }\`),re:()=>o().optional().describe("r"),`,
  '...!1,...flag&&{gated:()=>H().optional().describe("Gated key")},',
  "...Qr(Xi(e),(i)=>()=>i)};",
].join("");

test("the scanner skips braces inside strings, templates, and regex literals", () => {
  const dollar = "$";
  const tpl = `\`}${dollar}{"}"}\``;
  const src = `{a:"}",b:${tpl},c:/}/,d:[1,2]}`;
  assert.equal(matchClose(src, 0), src.length - 1);
  assert.deepEqual(splitTop(src.slice(1, -1)), [
    'a:"}"',
    `b:${tpl}`,
    "c:/}/",
    "d:[1,2]",
  ]);
  assert.equal(skipToken("a / b", 2, "a"), 2);
  assert.equal(skipToken("x=/a\\/[/]/g;", 2, "="), 11);
});

test("`unquote` reads escapes, and `chainCalls` reads a type chain", () => {
  assert.equal(unquote('"a\\u2014b\\n\\"c"'), 'a\u2014b\n"c');
  const { head, calls } = chainCalls('v().int().min(1).describe("x, y")');
  assert.equal(head, "v");
  assert.deepEqual(calls, [
    ["int", ""],
    ["min", "1"],
    ["describe", '"x, y"'],
  ]);
});

test("the fixture gives its keys, nested keys, and managed-only keys", () => {
  const body = findSchemaBody(FIXTURE);
  assert.deepEqual(
    parseEntries(body, true).map(([k]) => k),
    [
      "$schema",
      "model",
      "permissions",
      "sandbox",
      "polOnly",
      "pat",
      "re",
      "gated",
    ],
  );
  const { user, managed } = buildSchemas(FIXTURE, VERSION);
  assert.equal(managed.properties.model.description, "A \u2014 b");
  assert.equal(managed.properties.permissions.properties.allow.type, "array");
  assert.deepEqual(managed.properties.permissions.properties.mode.enum, [
    "a",
    "b",
  ]);
  assert.partialDeepStrictEqual(managed.properties.sandbox.properties.level, {
    type: "integer",
    minimum: 1,
  });
  assert.equal(managed.properties.polOnly["x-managed-only"], true);
  assert.equal(user.properties.polOnly, undefined);
  assert.deepEqual(validate({ polOnly: true }, user), [
    '(root): unknown key "polOnly"',
  ]);
  assert.deepEqual(validate({ polOnly: true }, managed), []);
});

test("a bundle without the schema fails with the version and writes no file", () => {
  assert.throws(() => buildSchemas("var a=1;", VERSION), {
    message: new RegExp(VERSION.replaceAll(".", "\\.")),
  });
  assert.throws(() => buildSchemas(FIXTURE, "0.0.1"), { message: /0\.0\.1/ });
  const dir = tmpDir("schema-test");
  try {
    const bundle = path.join(dir, "bundle.js");
    const out = path.join(dir, "out");
    fs.writeFileSync(bundle, "var a=1;", "latin1");
    const run = spawnSync(
      process.execPath,
      [
        path.join(REPO, "plugins/dotclaude-lab/bin/dotclaude-schema"),
        "--bundle",
        bundle,
        "--version",
        VERSION,
        "--out",
        out,
      ],
      { encoding: "utf8" },
    );
    assert.notEqual(run.status, 0);
    assert.ok(run.stderr.includes(VERSION), run.stderr);
    assert.equal(fs.existsSync(out), false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("the shipped schema keeps the keys that the profile relies on, with descriptions", () => {
  const { properties } = shipped("managed");
  for (const key of [
    "syncClaudeAiSkills",
    "syncClaudeAiPlugins",
    "prependPlugins",
    "appendPlugins",
    "skillOverrides",
    "disableClaudeAiConnectors",
  ])
    assert.ok(properties[key].description);
});

test("a build that reuses short names takes the last definition before the schema", () => {
  const bundle = [
    'var a=p(()=>u({type:C("tombstone")}));',
    "var b=1;",
    "var Z=p(()=>u({early:H()}));",
    "var Y=p(()=>wrap(A(o())));",
    "var Z=p(()=>u({late:H().optional()}));",
    "const s={$schema:()=>o().optional(),",
    "keep:()=>Ae(()=>Z()),",
    "wrapped:()=>Ae(()=>Y()),};",
    "var Y=p(()=>u({after:H()}));",
  ].join("");
  const { user } = buildSchemas(bundle, VERSION);
  assert.deepEqual(Object.keys(user.properties.keep.properties), ["late"]);
  assert.deepEqual(user.properties.wrapped, {});
});

test("a lazy reference to a record helper gives an object", () => {
  const bundle = [
    "var E=p(()=>ue(o(),o()));",
    "const s={$schema:()=>o().optional(),",
    "env:()=>Ae(()=>E()),};",
  ].join("");
  const { user } = buildSchemas(bundle, VERSION);
  assert.deepEqual(user.properties.env, {
    type: "object",
    additionalProperties: { type: "string" },
  });
});

test("`forceLoginGatewayUrl` is a user key and not managed-only", () => {
  const user = shipped("user").properties;
  const managed = shipped("managed").properties;
  assert.equal(user.forceLoginGatewayUrl.type, "string");
  assert.equal(managed.forceLoginGatewayUrl["x-managed-only"], undefined);
  assert.equal(isManagedOnly(user.forceLoginGatewayUrl.description), false);
  assert.notEqual(user.forceLoginMethod, undefined);
});

test("each schema names the version in a root `$comment` and has no `x-claude-code-version`", () => {
  const { user, managed } = buildSchemas(FIXTURE, VERSION);
  for (const schema of [user, managed]) {
    assert.equal(schema.$comment, `Extracted from Claude Code ${VERSION}`);
    assert.equal("x-claude-code-version" in schema, false);
  }
});

test("each shipped schema file names a Claude Code version in the root `$comment`, with no `x-claude-code-version`", () => {
  for (const name of Object.values(schemaFiles())) {
    const schema = JSON.parse(
      fs.readFileSync(path.join(REPO, "schemas", name), "utf8"),
    );
    assert.match(schema.$comment, /^Extracted from Claude Code \d+\.\d+\.\d+$/);
    assert.equal("x-claude-code-version" in schema, false);
  }
});

test("`isManagedOnly` reads the admin-controlled text", () => {
  const managed =
    "Cloud gateway URL to pre-fill. Honored only from admin-controlled managed settings (MDM / managed-settings.json / policy helper).";
  const both =
    "Cloud gateway URL to pre-fill. Honored from admin-controlled managed settings (MDM / managed-settings.json / policy helper) and, on a machine with none of those, from your own user settings.";
  assert.equal(isManagedOnly(managed), true);
  assert.equal(isManagedOnly(both), false);
});

test("the shipped schema has nested keys, and marks the managed-only keys", () => {
  const user = shipped("user").properties;
  const managed = shipped("managed").properties;
  assert.equal(
    user.sandbox.properties.allowUnsandboxedCommands.type,
    "boolean",
  );
  assert.equal(user.statusLine.properties.refreshInterval.minimum, 1);
  assert.notEqual(user.permissions.properties.defaultMode, undefined);
  assert.equal(user.env.type, "object");
  assert.equal(managed.prependPlugins["x-managed-only"], true);
  assert.equal(
    managed.sandbox.properties.network.properties.allowManagedDomainsOnly[
      "x-managed-only"
    ],
    true,
  );
  assert.equal(user.prependPlugins, undefined);
  assert.equal(
    user.sandbox.properties.network.properties.allowManagedDomainsOnly,
    undefined,
  );
});

test("a managed-only key in the user settings fails", () => {
  assert.deepEqual(validate({ prependPlugins: [] }, shipped("user")), [
    '(root): unknown key "prependPlugins"',
  ]);
});
