// Builds the JSON Schema of Claude Code `settings.json` and `managed-settings.json` from the bundle text.
// The public schema lacks keys such as `syncClaudeAiSkills` and `prependPlugins`, so the bundle is the source.
// The bundle holds one object of thunks, `{$schema:()=>o().optional().describe("..."),...}`.
// The scanner matches its braces, then reads each key, its type chain, and its `.describe()` text.
// The minified type helpers change with each build, so TYPES holds a table per version.
// A version without a table fails with a message, because a wrong table gives a wrong schema.
// The file names have no version, so the `$schema` links stay the same.
// The version is in the root `$comment` and in `title` inside each file.
// A key that its description limits to managed settings is absent from the first file
// and carries `x-managed-only` in the second.
// The code items of each description go in single backticks (`spans.ts`).
// This module does no I/O. The CLI adapter writes the files.

import { fallbackOf } from "./descriptions.ts";
import { applyManaged } from "./managed.ts";
import type { Ctx, Schema } from "./model.ts";
import { findSchemaBody, parseEntries } from "./scan.ts";
import { applyCodeSpans } from "./spans.ts";
import { TYPES, typeSchema } from "./types.ts";

export { applyManaged, isManagedOnly } from "./managed.ts";
export { applyCodeSpans, wrapCodeSpans } from "./spans.ts";
export { TYPES, typeSchema } from "./types.ts";

// The two files that the command writes.
export type SchemaKind = "user" | "managed";

export class SchemaError extends Error {}

export const schemaFiles = (): Record<SchemaKind, string> => ({
  user: "claude-code-settings.json",
  managed: "claude-code-managed-settings.json",
});

// Both schemas from the bundle text. Throws SchemaError when the scan finds no schema,
// or when a top-level key has no description in the bundle and none in `FALLBACK`.
export const buildSchemas = (
  src: string,
  version: string,
): Record<SchemaKind, Schema> => {
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
  for (const [key, sub] of Object.entries(properties)) {
    const text = sub.description ?? fallbackOf(key);
    if (text === undefined)
      throw new SchemaError(
        `the key "${key}" of Claude Code ${version} has no description`,
      );
    sub.description = text;
  }
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
};

// The dotted paths of the keys in `shipped` that `built` does not have, at any depth.
// The check compares a file in `schemas/` with the schema that the bundle gives.
export const unreadKeys = (shipped: Schema, built: Schema, at = ""): string[] =>
  Object.entries(shipped.properties ?? {}).flatMap(([key, sub]) => {
    const path = at ? `${at}.${key}` : key;
    const known = built.properties?.[key];
    return known ? unreadKeys(sub, known, path) : [path];
  });
