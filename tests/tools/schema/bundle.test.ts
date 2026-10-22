// The shipped schemas against the bundle of the installed `claude`.
// The tests skip when `claude` is not on `PATH`, and they run in the lab.

import { expect, test } from "bun:test";
import path from "node:path";
import { BUNDLE_SCAN_TIMEOUT_MS } from "../../../tools/limits.ts";
import {
  installedBundle,
  versionOf,
} from "../../../tools/schema/adapters/cli.ts";
import {
  buildSchemas,
  schemaFiles,
  unreadKeys,
} from "../../../tools/schema/domain/build.ts";
import type { Schema } from "../../../tools/schema/domain/types.ts";
import { REPO } from "../../support/repo.ts";

const installed = (): string | null =>
  Bun.which("claude") ? installedBundle() : null;

const shipped = async (kind: "user" | "managed"): Promise<Schema> =>
  JSON.parse(
    await Bun.file(path.join(REPO, "schemas", schemaFiles()[kind])).text(),
  ) as Schema;

// The bundle is read as latin1, as the command reads it.
const bundleText = async (file: string): Promise<string> =>
  Buffer.from(await Bun.file(file).arrayBuffer()).toString("latin1");

test.skipIf(installed() === null)(
  "each key in `schemas/` is a key that the installed binary reads",
  async () => {
    const bundle = installed() as string;
    const built = buildSchemas(await bundleText(bundle), versionOf(bundle));
    expect(unreadKeys(await shipped("user"), built.user)).toStrictEqual([]);
    expect(unreadKeys(await shipped("managed"), built.managed)).toStrictEqual(
      [],
    );
  },
  BUNDLE_SCAN_TIMEOUT_MS,
);

test("`unreadKeys` names each shipped key that the built schema lacks, at any depth", () => {
  const built: Schema = {
    properties: { a: { properties: { x: {} } } },
  };
  const shippedSchema: Schema = {
    properties: {
      a: { properties: { x: {}, gone: {} } },
      b: {},
    },
  };
  expect(unreadKeys(shippedSchema, built)).toStrictEqual(["a.gone", "b"]);
  expect(unreadKeys(built, built)).toStrictEqual([]);
});

test("each top-level key of the shipped schemas has a description", async () => {
  for (const kind of ["user", "managed"] as const)
    for (const [key, sub] of Object.entries(
      (await shipped(kind)).properties ?? {},
    ))
      expect(sub.description, `${kind}: ${key}`).toBeTruthy();
});
