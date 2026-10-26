import {
  FALLBACK_DESCRIPTIONS,
  NO_SETTINGS_KEYS,
  NO_TYPE_HELPERS,
} from "../prompts.ts";
import { findFeatureShapes, findSchemaBody, parseEntries } from "./scan.ts";
import { applyCodeSpans } from "./spans.ts";
import { type Ctx, type Schema, typeSchema } from "./types.ts";

const MANAGED_ONLY = [
  /\bonly (?:honou?red |read |enforced |applies )?(?:from|in) (?:the )?(?:admin-controlled |device )?(?:managed|policy)/i,
  /\b(?:honou?red|read|enforced) only (?:from|in) (?:the )?(?:admin-controlled |device )?(?:managed|policy|HKLM)/i,
  /(?:^|[.(] ?|\bRead from )managed settings only/i,
  /\(and set in (?:device )?managed settings/i,
  /^When set in managed settings/,
];

export const isManagedOnly = (description = ""): boolean =>
  MANAGED_ONLY.some((re) => re.test(description));

export const applyManaged = (schema: Schema, strip: boolean): Schema => {
  if (!schema.properties) {
    if (schema.items) schema.items = applyManaged(schema.items, strip);
    return schema;
  }
  const props: Record<string, Schema> = {};
  for (const [key, sub] of Object.entries(schema.properties)) {
    const managed = isManagedOnly(sub.description);
    if (managed && strip) continue;
    const next = applyManaged(structuredClone(sub), strip);
    if (managed) next["x-managed-only"] = true;
    props[key] = next;
  }
  const out: Schema = { ...schema, properties: props };
  if (out.required) out.required = out.required.filter((key) => key in props);
  return out;
};

export type SchemaKind = "user" | "managed";

export class SchemaError extends Error {}

export const fallbackOf = (key: string): string | undefined =>
  Object.hasOwn(FALLBACK_DESCRIPTIONS, key)
    ? (FALLBACK_DESCRIPTIONS as Record<string, string>)[key]
    : undefined;

export const schemaFiles = (): Record<SchemaKind, string> => ({
  user: "claude-code-settings.json",
  managed: "claude-code-managed-settings.json",
});

// The public schema lacks keys such as `syncClaudeAiSkills`, so the bundle is the source.
export const buildSchemas = (
  src: string,
  version: string,
): Record<SchemaKind, Schema> => {
  const body = findSchemaBody(src);
  if (body === null)
    throw new SchemaError(
      `no settings schema found in the bundle of Claude Code ${version}`,
    );
  const ctx: Ctx = { src, stack: new Set() };
  const properties: Record<string, Schema> = {};
  for (const [key, expr] of parseEntries(body, true))
    properties[key] = typeSchema(expr, ctx);
  for (const shape of findFeatureShapes(src))
    for (const [key, expr] of parseEntries(shape, false))
      properties[key] = typeSchema(expr, ctx);
  if (Object.keys(properties).length === 0)
    throw new SchemaError(NO_SETTINGS_KEYS({ version }));
  if (
    Object.values(properties).every((sub) =>
      Object.keys(sub).every((k) => k === "description"),
    )
  )
    throw new SchemaError(NO_TYPE_HELPERS({ version }));
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

export const unreadKeys = (shipped: Schema, built: Schema, at = ""): string[] =>
  Object.entries(shipped.properties ?? {}).flatMap(([key, sub]) => {
    const path = at ? `${at}.${key}` : key;
    const known = built.properties?.[key];
    return known ? unreadKeys(sub, known, path) : [path];
  });
