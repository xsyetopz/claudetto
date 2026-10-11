// Writes the JSON Schema of Claude Code `settings.json` from the installed bundle,
// because the public schema lacks keys such as `syncClaudeAiSkills` and `prependPlugins`.
//
// The command is `bin/dotclaude-schema`.
//
// Reads the bundle and never changes it.
// The bundle holds one object of thunks, `{$schema:()=>o().optional().describe("..."),...}`.
// The script matches its braces with a scanner that skips strings, template literals,
// regex literals, and comments, then reads each key, its type chain, and its `.describe()` text.
// The minified type helpers (`o`, `H`, `v`, ...) change with each build, so TYPES holds a table per version.
// A version without a table fails with a message, because a wrong table gives a wrong schema.
// Writes `claude-code-settings.json` and `claude-code-managed-settings.json`.
// The file names have no version, so the `$schema` links stay the same.
// The version is in the root `$comment` and in `title` inside each file.
// A key that its description limits to managed settings is absent from the first file
// and carries `x-managed-only` in the second.
// The code items of each description go in single backticks (`spans.ts`).
// `buildSchemas` throws `SchemaError` and writes nothing when the scan finds no schema.

import fs from "node:fs";
import path from "node:path";
import { applyManaged } from "./managed.ts";
import type { Ctx, Schema } from "./model.ts";
import { findSchemaBody, parseEntries } from "./scan.ts";
import { applyCodeSpans } from "./spans.ts";
import { TYPES, typeSchema } from "./types.ts";

export { applyManaged, isManagedOnly } from "./managed.ts";
export {
  ANCHOR,
  chainCalls,
  findSchemaBody,
  matchClose,
  parseEntries,
  skipToken,
  splitTop,
  unquote,
} from "./scan.ts";
export { applyCodeSpans, wrapCodeSpans } from "./spans.ts";
export { TYPES, typeSchema } from "./types.ts";

// The two files that the command writes.
type SchemaKind = "user" | "managed";

export class SchemaError extends Error {}

// Both schemas from the bundle text. Throws SchemaError when the scan finds no schema.
export function buildSchemas(
  src: string,
  version: string,
): Record<SchemaKind, Schema> {
  const types = TYPES[version];
  if (!types)
    throw new SchemaError(`no type helper table for Claude Code ${version}`);
  const body = findSchemaBody(src);
  if (body === null)
    throw new SchemaError(
      `no settings schema found in the bundle of Claude Code ${version}`,
    );
  const ctx: Ctx = { src, types, stack: new Set() };
  const properties: Record<string, Schema> = {};
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

export function schemaFiles(): Record<SchemaKind, string> {
  return {
    user: "claude-code-settings.json",
    managed: "claude-code-managed-settings.json",
  };
}

// Builds both schemas and writes them to `outDir`. Writes nothing when the build throws.
export async function writeSchemas(
  src: string,
  version: string,
  outDir: string,
): Promise<{ names: Record<SchemaKind, string>; count: number }> {
  const schemas = buildSchemas(src, version);
  const names = schemaFiles();
  fs.mkdirSync(outDir, { recursive: true });
  for (const kind of ["user", "managed"] as const)
    await Bun.write(
      path.join(outDir, names[kind]),
      `${JSON.stringify(schemas[kind], null, 2)}\n`,
    );
  return {
    names,
    count: Object.keys(schemas.user.properties as Record<string, Schema>)
      .length,
  };
}
