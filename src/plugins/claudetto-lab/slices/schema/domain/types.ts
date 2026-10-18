import { kindOf } from "./helpers.ts";
import {
  type Call,
  chainCalls,
  exprEnd,
  matchClose,
  parseEntries,
  splitPlus,
  splitTop,
  unquote,
} from "./scan.ts";

export type Ctx = {
  src: string;
  stack: Set<string>;
  defs?: Map<string, number[]>;
  scopes?: {
    home: string;
    imported: Map<string, { text: string; local: string }>;
  };
  kinds?: Map<string, string | undefined>;
};

export type Schema = {
  type?: string;
  description?: string;
  properties?: Record<string, Schema>;
  items?: Schema;
  additionalProperties?: Schema | boolean;
  anyOf?: Schema[];
  required?: string[];
  [key: string]: unknown;
};

const DEPTH_MAX = 8;

const isLiteralPart = (part: string): boolean =>
  /^(["'`])/.test(part) &&
  !(part.startsWith("`") && part.replace(/\\[\s\S]/g, "").includes("${"));

const literalText = (expr: string): string =>
  splitPlus(expr.trim()).filter(isLiteralPart).map(unquote).join("");

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

export const typeSchema = (
  expr: string,
  ctx: Ctx,
  depth = 0,
  isProp = false,
): Schema => {
  const inlined = inlineBlock(expr);
  if (inlined !== null) return typeSchema(inlined, ctx, depth, isProp);
  const { head, headArgs = "", calls } = chainCalls(expr);
  const kind = kindOf(ctx, head);
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

const unionSchema = (args: string, ctx: Ctx, depth: number): Schema => {
  const [list = ""] = splitTop(args);
  const members = splitTop(list.replace(/^\[|\]$/g, ""));
  return {
    anyOf: members.map((member) => typeSchema(member, ctx, depth + 1)),
  };
};

const isRequired = (expr: string, ctx: Ctx): boolean => {
  const { head } = chainCalls(expr);
  return (
    kindOf(ctx, head) !== undefined &&
    !/\.(?:optional|catch|default|nullish)\(/.test(expr)
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

const follow = (
  name: string,
  unique: boolean,
  ctx: Ctx,
  depth: number,
): Schema => {
  if (depth > DEPTH_MAX || ctx.stack.has(name)) return {};
  const body = findDefinition(ctx, name, unique);
  if (body === null) return {};
  ctx.stack.add(name);
  const out = typeSchema(body, ctx, depth + 1);
  ctx.stack.delete(name);
  return out;
};

// A record or array item is not followed, because `A(Wo())` named a different `Wo` in the bundle.
const plainRefSchema = (
  head: string,
  args: string,
  ctx: Ctx,
  depth: number,
): Schema =>
  args.trim() !== "" || !/^[\w$]+$/.test(head)
    ? {}
    : follow(head, true, ctx, depth);

const lazySchema = (args: string, ctx: Ctx, depth: number): Schema => {
  const inline = /^\(\)=>([\s\S]*)$/.exec(args.trim());
  const m = /^\(\)=>([\w$]+)\(/.exec(args.trim());
  if (inline && m && kindOf(ctx, m[1] as string) !== undefined)
    return typeSchema(inline[1] as string, ctx, depth + 1);
  return m ? follow(m[1] as string, false, ctx, depth) : {};
};

export const findDefinition = (
  ctx: Ctx,
  name: string,
  unique = false,
): string | null => {
  const { src } = ctx;
  ctx.defs ??= definitions(src);
  const hits = [...(ctx.defs.get(name) ?? [])];
  const shaped = hits.filter((end) => isShape(ctx, end));
  // The last definition before the schema wins.
  const from = hits.pop();
  if (from === undefined || !shaped.includes(from)) return null;
  if (unique && shaped.length > 1) return null;
  return src.slice(from, exprEnd(src, from));
};

// The bundle is about 240 MB and one pass costs about 80 ms, so 2 passes for all names replace 24 passes for each name.
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

const isShape = (ctx: Ctx, at: number): boolean => {
  const name = /^[\w$]+/.exec(ctx.src.slice(at, at + 8))?.[0];
  return (
    name !== undefined &&
    ctx.src[at + name.length] === "(" &&
    ["object", "record"].includes(kindOf(ctx, name) as string)
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
