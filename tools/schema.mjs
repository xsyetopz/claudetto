#!/usr/bin/env bun
// Writes the JSON Schema of Claude Code `settings.json` from the installed bundle,
// because the public schema lacks keys such as `syncClaudeAiSkills` and `prependPlugins`.
//
//   bun tools/schema.mjs [--bundle FILE] [--version X.Y.Z] [--out DIR]
//
// Reads the bundle and never changes it.
// The bundle holds one object of thunks, `{$schema:()=>o().optional().describe("..."),...}`.
// The script matches its braces with a scanner that skips strings, template literals,
// regex literals, and comments, then reads each key, its type chain, and its `.describe()` text.
// The minified type helpers (`o`, `H`, `v`, ...) change with each build, so TYPES holds a table per version.
// A version without a table fails with a message, because a wrong table gives a wrong schema.
// Writes `schemas/claude-code-settings.json` and `schemas/claude-code-managed-settings.json`.
// The file names have no version, so the `$schema` links stay the same.
// The version is in the root `$comment` and in `title` inside each file.
// A key that its description limits to managed settings is absent from the first file
// and carries `x-managed-only` in the second.
// The code items of each description go in single backticks (`schema/spans.mjs`).
// Exits non-zero and writes nothing when the scan finds no schema.

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { applyManaged } from "./schema/managed.mjs";
import { findSchemaBody, parseEntries } from "./schema/scan.mjs";
import { applyCodeSpans } from "./schema/spans.mjs";
import { SCOPED, TYPES, typeSchema } from "./schema/types.mjs";

export { applyManaged, isManagedOnly } from "./schema/managed.mjs";
export {
  ANCHOR,
  chainCalls,
  findSchemaBody,
  matchClose,
  parseEntries,
  skipToken,
  splitTop,
  unquote,
} from "./schema/scan.mjs";
export { applyCodeSpans, wrapCodeSpans } from "./schema/spans.mjs";
export { TYPES, typeSchema } from "./schema/types.mjs";

export class SchemaError extends Error {}

// Both schemas from the bundle text. Throws SchemaError when the scan finds no schema.
export function buildSchemas(src, version) {
  const types = TYPES[version];
  if (!types)
    throw new SchemaError(`no type helper table for Claude Code ${version}`);
  const body = findSchemaBody(src);
  if (body === null)
    throw new SchemaError(
      `no settings schema found in the bundle of Claude Code ${version}`,
    );
  const ctx = { src, types, scoped: SCOPED.has(version), stack: new Set() };
  const properties = {};
  for (const [key, expr] of parseEntries(body, true))
    properties[key] = typeSchema(expr, ctx);
  if (Object.keys(properties).length === 0)
    throw new SchemaError(
      `the settings schema of Claude Code ${version} has no keys`,
    );
  const base = {
    $schema: "http://json-schema.org/draft-07/schema#",
    $comment: `Extracted from Claude Code ${version}`,
    type: "object",
    properties,
    additionalProperties: false,
  };
  return {
    user: {
      ...applyCodeSpans(applyManaged(base, true)),
      title: `Claude Code ${version} settings.json`,
    },
    managed: {
      ...applyCodeSpans(applyManaged(base, false)),
      title: `Claude Code ${version} managed-settings.json`,
    },
  };
}

export function schemaFiles() {
  return {
    user: "claude-code-settings.json",
    managed: "claude-code-managed-settings.json",
  };
}

// Builds both schemas and writes them to `outDir`. Writes nothing when the build throws.
export function writeSchemas(src, version, outDir) {
  const schemas = buildSchemas(src, version);
  const names = schemaFiles();
  fs.mkdirSync(outDir, { recursive: true });
  for (const kind of ["user", "managed"])
    fs.writeFileSync(
      path.join(outDir, names[kind]),
      `${JSON.stringify(schemas[kind], null, 2)}\n`,
    );
  return { names, count: Object.keys(schemas.user.properties).length };
}

function installedBundle() {
  const bin = execFileSync("which", ["claude"], { encoding: "utf8" }).trim();
  return fs.realpathSync(bin);
}

function versionOf(bundle) {
  const base = path.basename(bundle);
  if (/^\d+\.\d+\.\d+$/.test(base)) return base;
  const out = execFileSync(bundle, ["--version"], { encoding: "utf8" });
  return /\d+\.\d+\.\d+/.exec(out)?.[0] ?? "unknown";
}

function main(argv) {
  const opt = (name) => {
    const at = argv.indexOf(name);
    return at < 0 ? undefined : argv[at + 1];
  };
  const bundle = opt("--bundle") ?? installedBundle();
  const version = opt("--version") ?? versionOf(bundle);
  const outDir = opt("--out") ?? path.join(import.meta.dirname, "../schemas");
  try {
    const { names, count } = writeSchemas(
      fs.readFileSync(bundle, "latin1"),
      version,
      outDir,
    );
    console.log(`Claude Code ${version}: ${count} top-level keys`);
    for (const name of Object.values(names))
      console.log(path.join(outDir, name));
  } catch (err) {
    if (!(err instanceof SchemaError)) throw err;
    console.error(`schema: ${err.message}`);
    process.exit(1);
  }
}

if (import.meta.main) main(process.argv.slice(2));
