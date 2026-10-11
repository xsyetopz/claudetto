// The type chains of the bundle as JSON Schema.
// The minified type helpers (`o`, `H`, `v`, ...) change with each build, so TYPES holds a table per version.

import {
  chainCalls,
  exprEnd,
  parseEntries,
  splitPlus,
  splitTop,
  unquote,
} from "./scan.mjs";

const DEPTH_MAX = 8;

// Minified helper name to its meaning, for each supported version.
// Only the latest Claude Code has a table, because each build renames the helpers.
export const TYPES = {
  "2.1.296": {
    o: "string",
    H: "boolean",
    v: "number",
    u: "object",
    A: "array",
    U: "enum",
    C: "const",
    ue: "record",
    Ae: "lazy",
  },
};

// The literal parts of a string expression, joined: `"a "+Ws+"b"` gives `a b`.
function literalText(expr) {
  const parts = splitPlus(expr.trim());
  return parts
    .filter((p) => /^(["'`])/.test(p) && !p.includes("${"))
    .map(unquote)
    .join("");
}

// The JSON Schema of one type expression.
export function typeSchema(expr, ctx, depth = 0, isProp = false) {
  const { head, headArgs = "", calls } = chainCalls(expr);
  const kind = ctx.types[head];
  const out = {};
  let schema;
  if (kind === "string" || kind === "boolean") schema = { type: kind };
  else if (kind === "number") schema = { type: "number" };
  else if (kind === "const") schema = constSchema(headArgs);
  else if (kind === "enum") schema = enumSchema(headArgs);
  else if (kind === "array")
    schema = { type: "array", items: typeSchema(headArgs, ctx, depth + 1) };
  else if (kind === "record") schema = recordSchema(headArgs, ctx, depth);
  else if (kind === "object")
    schema = objectSchema(headArgs, ctx, depth, calls);
  else if (kind === "lazy") schema = lazySchema(headArgs, ctx, depth);
  else schema = isProp ? plainRefSchema(head, headArgs, ctx, depth) : {};
  Object.assign(out, schema);
  for (const [name, args] of calls) applyCall(out, name, args);
  return out;
}

function constSchema(args) {
  const t = args.trim();
  return /^["'`]/.test(t) ? { const: unquote(t) } : {};
}

function enumSchema(args) {
  const items = splitTop(args.replace(/^\[|\]$/g, ""));
  const values = items.filter((s) => /^["']/.test(s)).map(unquote);
  return values.length > 0 ? { enum: values } : { type: "string" };
}

function recordSchema(args, ctx, depth) {
  const [, value] = splitTop(args);
  const items = value ? typeSchema(value, ctx, depth + 1) : {};
  return { type: "object", additionalProperties: items };
}

// A key is required when its helper is known and nothing in its chain makes it optional.
// A call to an unknown function may be optional inside, so its key is not required.
function isRequired(expr, ctx) {
  const { head } = chainCalls(expr);
  return (
    head in ctx.types && !/\.(?:optional|catch|default|nullish)\(/.test(expr)
  );
}

function objectSchema(args, ctx, depth, calls) {
  if (!args.trim().startsWith("{")) return { type: "object" };
  const props = {};
  const required = [];
  for (const [key, expr] of parseEntries(args.trim().slice(1, -1), false)) {
    props[key] = typeSchema(expr, ctx, depth + 1, true);
    if (isRequired(expr, ctx)) required.push(key);
  }
  const open = calls.some(([name]) => name === "passthrough");
  const out = { type: "object", properties: props };
  if (required.length > 0) out.required = required;
  if (!open) out.additionalProperties = false;
  return out;
}

// A plain call with no arguments as the value of a property, such as `network:Gc()`.
// An array item or a record value is not followed, because `A(Wo())` named a different `Wo` in the bundle.
// The minified names repeat in other modules, so the call resolves only when the bundle has one definition of the name.
function plainRefSchema(head, args, ctx, depth) {
  if (args.trim() !== "" || !/^[\w$]+$/.test(head)) return {};
  if (depth > DEPTH_MAX || ctx.stack.has(head)) return {};
  const body = findDefinition(ctx, head, true);
  if (body === null) return {};
  ctx.stack.add(head);
  const out = typeSchema(body, ctx, depth + 1);
  ctx.stack.delete(head);
  return out;
}

// A lazy reference, `Ae(()=>yFn())` or `Ae(()=>ya(e))`, to a function that the bundle defines.
// The first definition wins.
function lazySchema(args, ctx, depth) {
  const inline = /^\(\)=>([\s\S]*)$/.exec(args.trim());
  const m = /^\(\)=>([\w$]+)\(/.exec(args.trim());
  if (inline && m && m[1] in ctx.types)
    return typeSchema(inline[1], ctx, depth + 1);
  if (!m || depth > DEPTH_MAX || ctx.stack.has(m[1])) return {};
  const body = findDefinition(ctx, m[1], false);
  if (body === null) return {};
  ctx.stack.add(m[1]);
  const out = typeSchema(body, ctx, depth + 1);
  ctx.stack.delete(m[1]);
  return out;
}

// The expression that builds the schema `name`, from `function name(){return u({...})}`
// or `name=f(()=>u({...}))`. Returns null when the definition is not an object or a record.
// The bundle reuses short names in other modules, so the last definition before the schema is the one it uses.
// A definition of another shape, such as a wrapper call, gives null, and not an earlier definition of the same name.
export function findDefinition(ctx, name, unique = false) {
  const { src, types } = ctx;
  const esc = name.replace(/\$/g, "\\$");
  const re = new RegExp(
    `(?:function ${esc}\\([^)]*\\)\\{return |[,;\\s]${esc}=(?:[fp]\\(\\(\\)=>|\\(\\)=>|\\([\\w$,]*\\)=>))`,
    "g",
  );
  const hits = [...src.matchAll(re)];
  const shaped = hits.filter((h) => isShape(src, h.index + h[0].length, types));
  const limit = src.indexOf("{$schema:()=>");
  const m = hits.filter((h) => limit < 0 || h.index < limit).pop();
  if (!m || !shaped.includes(m) || (unique && shaped.length > 1)) return null;
  const from = m.index + m[0].length;
  return src.slice(from, exprEnd(src, from));
}

// The object and record helpers of the version, such as `u` and `ue`.
const isShape = (src, at, types) => {
  const name = /^[\w$]+/.exec(src.slice(at, at + 8))?.[0];
  return (
    src[at + (name?.length ?? 0)] === "(" &&
    ["object", "record"].includes(types[name])
  );
};

function applyCall(out, name, args) {
  if (name === "describe") {
    const text = literalText(args);
    if (text) out.description = text;
  } else if (name === "min" && isNumber(out) && /^-?\d/.test(args))
    out.minimum = Number(args);
  else if (name === "max" && isNumber(out) && /^-?\d/.test(args))
    out.maximum = Number(args);
  else if (name === "int" && isNumber(out)) out.type = "integer";
}

const isNumber = (schema) =>
  schema.type === "number" || schema.type === "integer";
