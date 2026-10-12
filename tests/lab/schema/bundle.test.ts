// The shipped schemas against the bundle of the installed `claude`.
// The tests skip when `claude` is not on `PATH`, and they run in the lab.

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import {
  buildSchemas,
  schemaFiles,
  unreadKeys,
} from "../../../src/plugins/dotclaude-lab/slices/schema/domain/build.ts";
import type { Schema } from "../../../src/plugins/dotclaude-lab/slices/schema/domain/model.ts";
import { REPO } from "../../support/repo.ts";

const installed = (): string | null => {
  const bin = Bun.which("claude");
  return bin ? fs.realpathSync(bin) : null;
};

const shipped = (kind: "user" | "managed"): Schema =>
  JSON.parse(
    fs.readFileSync(path.join(REPO, "schemas", schemaFiles()[kind]), "utf8"),
  ) as Schema;

// The bundle is read as latin1, as the command reads it.
const bundleText = (file: string): string =>
  Buffer.from(fs.readFileSync(file)).toString("latin1");

test.skipIf(installed() === null)(
  "each key in `schemas/` is a key that the installed binary reads",
  () => {
    const bundle = installed() as string;
    const built = buildSchemas(bundleText(bundle), path.basename(bundle));
    expect(unreadKeys(shipped("user"), built.user)).toStrictEqual([]);
    expect(unreadKeys(shipped("managed"), built.managed)).toStrictEqual([]);
  },
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

test("each top-level key of the shipped schemas has a description", () => {
  for (const kind of ["user", "managed"] as const)
    for (const [key, sub] of Object.entries(shipped(kind).properties ?? {}))
      expect(sub.description, `${kind}: ${key}`).toBeTruthy();
});
