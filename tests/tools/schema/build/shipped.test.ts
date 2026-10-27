// The shipped schemas and the build from a fixture bundle, part two.

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import {
  buildSchemas,
  fallbackOf,
  isManagedOnly,
  schemaFiles,
} from "../../../../dev/schema/domain/build.ts";
import type { Schema } from "../../../../dev/schema/domain/types.ts";
import { REPO, tmpDir } from "../../../support/repo.ts";
import { validate } from "../../../support/validate.ts";
import { spawnText } from "../../fixture-repo.ts";
import { at, FIXTURE, props, shipped, VERSION } from "./shared.ts";

test("`hooks` is an object of arrays in each shipped schema", async () => {
  for (const kind of ["user", "managed"] as const)
    expect(at(await shipped(kind), "hooks")).toMatchObject({
      type: "object",
      additionalProperties: { type: "array" },
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
    expect(schema["$comment"]).toContain(VERSION);
    expect("x-claude-code-version" in schema).toBe(false);
  }
});

test("each shipped schema file names a Claude Code version in the root `$comment`, with no `x-claude-code-version`", async () => {
  for (const name of Object.values(schemaFiles())) {
    const schema = JSON.parse(
      await Bun.file(path.join(REPO, "schemas", name)).text(),
    ) as Schema;
    expect(schema["$comment"]).toMatch(/\d+\.\d+\.\d+/);
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

test("a bundle whose `--version` exits non-zero fails the command and writes no file", async () => {
  const dir = await tmpDir("schema-test");
  try {
    // The file is a shell script, so `--version` exits 3, and it holds the schema, so the build alone would pass.
    const bundle = path.join(dir, "bundle");
    const out = path.join(dir, "out");
    await Bun.write(bundle, `#!/bin/sh\n# ${FIXTURE}\nexit 3\n`);
    fs.chmodSync(bundle, 0o755);
    const run = await spawnText(process.execPath, [
      path.join(REPO, "dev/schema/main.ts"),
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
});

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
