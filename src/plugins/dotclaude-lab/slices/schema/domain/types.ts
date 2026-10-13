// The type chains of the bundle as JSON Schema.
// The minified type helpers (`o`, `H`, `v`, ...) change with each build, so TYPES holds a table per version.

import type { Call, Ctx, Schema, TypeTable } from "./model.ts";
import {
  chainCalls,
  exprEnd,
  matchClose,
  parseEntries,
  splitPlus,
  splitTop,
  unquote,
} from "./scan.ts";

const DEPTH_MAX = 8;

// Minified helper name to its meaning, for each supported version.
// Only the latest Claude Code has a table, because each build renames the helpers.
export const TYPES: Record<string, TypeTable> = {
  "2.1.296": {
    o: "string",
    H: "boolean",
    v: "number",
    u: "object",
    A: "array",
    U: "enum",
    C: "const",
    ue: "record",
    Ue: "union",
    Ae: "lazy",
  },
};

// A string part of a `+` chain is literal text, unless it is a template with a real `${...}`.
// An escaped `\${` is text.
const isLiteralPart = (part: string): boolean =>
  /^(["'`])/.test(part) &&
  !(part.startsWith("`") && part.replace(/\\[\s\S]/g, "").includes("${"));

// The literal parts of a string expression, joined: `"a "+Ws+"b"` gives `a b`.
const literalText = (expr: string): string =>
  splitPlus(expr.trim()).filter(isLiteralPart).map(unquote).join("");

// A block thunk, `{let i=EXPR;return RET}`, as RET with each `i` replaced by EXPR.
// Returns null for any other expression.
export const inlineBlock = (expr: string): string | null => {
  const m = /^\{let ([\w$]+)=/.exec(expr);
  if (!m || matchClose(expr, 0) !== expr.length - 1) return null;
  const name = m[1] as string;
  const valueEnd = exprEnd(expr, m[0].length);
  const value = expr.slice(m[0].length, valueEnd);
  const ret = /^;return /.exec(expr.slice(valueEnd));
  if (!ret) return null;
  const body = expr.slice(valueEnd + ret[0].length, -1);
  const ref = new RegExp(
    `(?<![\\w$.])${name.replace(/\$/g, "\\$")}(?![\\w$])`,
    "g",
  );
  return body.replace(ref, () => value);
};

// The JSON Schema of one type expression.
export const typeSchema = (
  expr: string,
  ctx: Ctx,
  depth = 0,
  isProp = false,
): Schema => {
  const inlined = inlineBlock(expr);
  if (inlined !== null) return typeSchema(inlined, ctx, depth, isProp);
  const { head, headArgs = "", calls } = chainCalls(expr);
  const kind = ctx.types[head];
  const out: Schema = {};
  let schema: Schema | undefined;
  if (kind === "string" || kind === "boolean") schema = { type: kind };
  else if (kind === "number") schema = { type: "number" };
  else if (kind === "const") schema = constSchema(headArgs);
  else if (kind === "enum") schema = enumSchema(headArgs);
  else if (kind === "array")
    schema = { type: "array", items: typeSchema(headArgs, ctx, depth + 1) };
  else if (kind === "record") schema = recordSchema(headArgs, ctx, depth);
  else if (kind === "union") schema = unionSchema(headArgs, ctx, depth);
  else if (kind === "object")
    schema = objectSchema(headArgs, ctx, depth, calls);
  else if (kind === "lazy") schema = lazySchema(headArgs, ctx, depth);
  else schema = isProp ? plainRefSchema(head, headArgs, ctx, depth) : {};
  Object.assign(out, schema);
  for (const [name, args] of calls) applyCall(out, name, args);
  return out;
};

const constSchema = (args: string): Schema => {
  const t = args.trim();
  return /^["'`]/.test(t) ? { const: unquote(t) } : {};
};

const enumSchema = (args: string): Schema => {
  const items = splitTop(args.replace(/^\[|\]$/g, ""));
  const values = items.filter((s) => /^["']/.test(s)).map(unquote);
  return values.length > 0 ? { enum: values } : { type: "string" };
};

const recordSchema = (args: string, ctx: Ctx, depth: number): Schema => {
  const [, value] = splitTop(args);
  const items = value ? typeSchema(value, ctx, depth + 1) : {};
  return { type: "object", additionalProperties: items };
};

// The first argument of a union is its list of members, such as `[H(),u({...})]`.
const unionSchema = (args: string, ctx: Ctx, depth: number): Schema => {
  const [list = ""] = splitTop(args);
  const members = splitTop(list.replace(/^\[|\]$/g, ""));
  return {
    anyOf: members.map((member) => typeSchema(member, ctx, depth + 1)),
  };
};

// A key is required when its helper is known and nothing in its chain makes it optional.
// A call to an unknown function may be optional inside, so its key is not required.
const isRequired = (expr: string, ctx: Ctx): boolean => {
  const { head } = chainCalls(expr);
  return (
    head in ctx.types && !/\.(?:optional|catch|default|nullish)\(/.test(expr)
  );
};

const objectSchema = (
  args: string,
  ctx: Ctx,
  depth: number,
  calls: Call[],
): Schema => {
  if (!args.trim().startsWith("{")) return { type: "object" };
  const props: Record<string, Schema> = {};
  const required: string[] = [];
  for (const [key, expr] of parseEntries(args.trim().slice(1, -1), false)) {
    props[key] = typeSchema(expr, ctx, depth + 1, true);
    if (isRequired(expr, ctx)) required.push(key);
  }
  const open = calls.some(([name]) => name === "passthrough");
  const out: Schema = { type: "object", properties: props };
  if (required.length > 0) out.required = required;
  if (!open) out.additionalProperties = false;
  return out;
};

// A plain call with no arguments as the value of a property, such as `network:Gc()`.
// An array item or a record value is not followed, because `A(Wo())` named a different `Wo` in the bundle.
// The minified names repeat in other modules, so the call resolves only when the bundle has one definition of the name.
const plainRefSchema = (
  head: string,
  args: string,
  ctx: Ctx,
  depth: number,
): Schema => {
  if (args.trim() !== "" || !/^[\w$]+$/.test(head)) return {};
  if (depth > DEPTH_MAX || ctx.stack.has(head)) return {};
  const body = findDefinition(ctx, head, true);
  if (body === null) return {};
  ctx.stack.add(head);
  const out = typeSchema(body, ctx, depth + 1);
  ctx.stack.delete(head);
  return out;
};

// A lazy reference, `Ae(()=>yFn())` or `Ae(()=>ya(e))`, to a function that the bundle defines.
// The first definition wins.
const lazySchema = (args: string, ctx: Ctx, depth: number): Schema => {
  const inline = /^\(\)=>([\s\S]*)$/.exec(args.trim());
  const m = /^\(\)=>([\w$]+)\(/.exec(args.trim());
  if (inline && m && (m[1] as string) in ctx.types)
    return typeSchema(inline[1] as string, ctx, depth + 1);
  if (!m || depth > DEPTH_MAX || ctx.stack.has(m[1] as string)) return {};
  const body = findDefinition(ctx, m[1] as string, false);
  if (body === null) return {};
  ctx.stack.add(m[1] as string);
  const out = typeSchema(body, ctx, depth + 1);
  ctx.stack.delete(m[1] as string);
  return out;
};

// The expression that builds the schema `name`, from `function name(){return u({...})}`
// or `name=f(()=>u({...}))`. Returns `null` when the definition is not an object or a record.
// The bundle reuses short names in other modules, so the last definition before the schema is the one it uses.
// A definition of another shape, such as a wrapper call, gives null, and not an earlier definition of the same name.
export const findDefinition = (
  ctx: Ctx,
  name: string,
  unique = false,
): string | null => {
  const { src, types } = ctx;
  ctx.defs ??= definitions(src);
  const hits = [...(ctx.defs.get(name) ?? [])];
  const shaped = hits.filter((end) => isShape(src, end, types));
  const from = hits.pop();
  if (from === undefined || !shaped.includes(from)) return null;
  if (unique && shaped.length > 1) return null;
  return src.slice(from, exprEnd(src, from));
};

// The end of each definition before the schema, by name, in source order:
// `function name(...){return ` or `name=` with an arrow after it, after `,`, `;`, or a space.
// Only the definitions before the schema count, so a later module that reuses the name does not make it ambiguous.
//
// Speed: the bundle is about 240 MB, and one pass over it costs about 80 ms on a fast machine.
// A build looks up about 12 names, so a regex for each name made 24 passes, about 1.8 s, and CI runners are 4 times slower.
// A regex that starts with the literal name was not faster, because the cost is the pass and not the regex start.
// So the first lookup makes 2 passes that find the definitions of all names, and `ctx.defs` keeps them for the build:
// - The pass for `function name(` captures the name.
// - The pass for `=` with an arrow after it reads the name back from the `=`, over `[\w$]` characters.
//   That longest name, with `,`, `;`, or a space before it, is the same hit as `[,;\s]name=` for that one name.
// The result is the same as the regex for each name, and the build takes about 0.2 s.
const definitions = (src: string): Map<string, number[]> => {
  const anchor = src.indexOf("{$schema:()=>");
  const limit = anchor < 0 ? src.length : anchor;
  const hits: [string, number, number][] = [];
  for (const m of src.matchAll(/function ([\w$]+)\([^)]*\)\{return /g))
    if ((m.index as number) < limit)
      hits.push([m[1] as string, m.index as number, m.index + m[0].length]);
  for (const m of src.matchAll(/=(?:[fp]\(\(\)=>|\(\)=>|\([\w$,]*\)=>)/g)) {
    let at = m.index as number;
    while (at > 0 && /[\w$]/.test(src[at - 1] as string)) at--;
    const start = at - 1;
    if (at === m.index || start < 0 || start >= limit) continue;
    if (!/[,;\s]/.test(src[start] as string)) continue;
    hits.push([src.slice(at, m.index), start, m.index + m[0].length]);
  }
  const defs = new Map<string, number[]>();
  for (const [name, , end] of hits.sort((a, b) => a[1] - b[1])) {
    const ends = defs.get(name);
    if (ends) ends.push(end);
    else defs.set(name, [end]);
  }
  return defs;
};

// The object and record helpers of the version, such as `u` and `ue`.
const isShape = (src: string, at: number, types: TypeTable): boolean => {
  const name = /^[\w$]+/.exec(src.slice(at, at + 8))?.[0];
  return (
    src[at + (name?.length ?? 0)] === "(" &&
    ["object", "record"].includes(types[name as string] as string)
  );
};

const applyCall = (out: Schema, name: string, args: string): void => {
  if (name === "describe") {
    const text = literalText(args);
    if (text) out.description = text;
  } else if (name === "min" && isNumber(out) && /^-?\d/.test(args))
    out["minimum"] = Number(args);
  else if (name === "max" && isNumber(out) && /^-?\d/.test(args))
    out["maximum"] = Number(args);
  else if (name === "int" && isNumber(out)) out.type = "integer";
};

const isNumber = (schema: Schema): boolean =>
  schema.type === "number" || schema.type === "integer";
