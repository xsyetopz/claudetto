import { ANCHOR, matchClose } from "./scan.ts";
import type { Ctx } from "./types.ts";

const KINDS: Record<string, string> = {
  string: "string",
  boolean: "boolean",
  number: "number",
  object: "object",
  array: "array",
  enum: "enum",
  literal: "const",
  record: "record",
  union: "union",
  lazy: "lazy",
};

// Each module of the bundle starts with a `// @bun` line and reuses short minified names, so a name resolves in its own module.
const MODULE = "// @bun";

type Scope = { text: string; local: string };

const pairsOf = (list: string): [string, string][] =>
  list
    .split(",")
    .map((part) => part.trim().split(/\s+as\s+/))
    .filter((names) => names[0])
    .map(([a, b = a]) => [a as string, b as string]);

// Null unless exactly one module matches, because a wrong module gives a wrong schema.
const exporter = (
  src: string,
  names: string[],
): { text: string; inner: Map<string, string> } | null => {
  const found: { end: number; inner: Map<string, string> }[] = [];
  for (const m of src.matchAll(/export\{([^}]*)\}/g)) {
    const pairs = pairsOf(m[1] as string);
    const inner = new Map(pairs.map(([a, b]) => [b, a]));
    if (names.every((name) => inner.has(name)))
      found.push({ end: m.index as number, inner });
  }
  const [one] = found;
  if (found.length !== 1 || one === undefined) return null;
  const start = Math.max(src.lastIndexOf(MODULE, one.end), 0);
  return { text: src.slice(start, one.end), inner: one.inner };
};

const scopes = (
  src: string,
): { home: string; imported: Map<string, Scope> } => {
  const anchor = src.indexOf(ANCHOR);
  const start = Math.max(src.lastIndexOf(MODULE, anchor), 0);
  const next = src.indexOf(MODULE, anchor);
  const home = src.slice(start, next < 0 ? src.length : next);
  const imported = new Map<string, Scope>();
  for (const m of home.matchAll(/import\{([^}]*)\}from"[^"]*"/g)) {
    const pairs = pairsOf(m[1] as string);
    const found = exporter(
      src,
      pairs.map(([outer]) => outer),
    );
    if (found === null) continue;
    for (const [outer, local] of pairs)
      imported.set(local, {
        text: found.text,
        local: found.inner.get(outer) as string,
      });
  }
  return { home, imported };
};

const bodyOf = (text: string, name: string): string | null => {
  const start = text.lastIndexOf(`function ${name}(`);
  if (start < 0) return null;
  const close = matchClose(text, start + "function ".length + name.length);
  if (close === null || text[close + 1] !== "{") return null;
  const end = matchClose(text, close + 1);
  return end === null ? null : text.slice(close + 2, end);
};

const tagOf = (text: string, name: string, follow: boolean): string | null => {
  const body = bodyOf(text, name);
  if (body === null) return null;
  const tag = /type:"(\w+)"/.exec(body)?.[1];
  if (tag !== undefined) return tag;
  const factory = /^return ([\w$]+)\(/.exec(body)?.[1];
  return follow && factory ? tagOf(text, factory, false) : null;
};

export const kindOf = (ctx: Ctx, name: string): string | undefined => {
  ctx.kinds ??= new Map();
  if (!ctx.kinds.has(name)) {
    ctx.scopes ??= scopes(ctx.src);
    const scope = ctx.scopes.imported.get(name) ?? {
      text: ctx.scopes.home,
      local: name,
    };
    const tag = /^[\w$]+$/.test(name)
      ? tagOf(scope.text, scope.local, true)
      : null;
    ctx.kinds.set(
      name,
      tag !== null && Object.hasOwn(KINDS, tag) ? KINDS[tag] : undefined,
    );
  }
  return ctx.kinds.get(name);
};
