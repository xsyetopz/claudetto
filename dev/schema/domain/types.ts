import { findDefinition } from "./definitions.ts";
import { importOf, kindOf, type Scope, scopesIn } from "./helpers.ts";
import {
	type Call,
	chainCalls,
	exprEnd,
	matchClose,
	parseEntries,
	splitPlus,
	splitTop,
} from "./scan.ts";
import { unquote } from "./unquote.ts";

const IDENT_ONLY = /^[\w$]+$/;
const LET_BINDING = /^\{let ([\w$]+)=/;
const NUMBER_START = /^-?\d/;
const OPTIONAL_CALL = /\.(?:optional|catch|default|nullish)\(/;
const QUOTED_START = /^["'`]/;
const QUOTE_START = /^(["'`])/;
const QUOTE_START_DS = /^["']/;
const RETURN_PREFIX = /^;return /;
const THUNK_CALL = /^\(\)=>([\w$]+)\(/;
const THUNK_INLINE = /^\(\)=>([\s\S]*)$/;

export interface Ctx {
	/** The text that names resolve in: the whole bundle, or one module of it (see `moduleOf`). */
	src: string;
	/** The whole bundle, when `src` is one module of it. */
	bundle?: string;
	modules?: Map<Scope, Ctx>;
	stack: Set<string>;
	defs?: Map<string, number[]>;
	scopes?: {
		home: string;
		imported: Map<string, { text: string; local: string }>;
	};
	kinds?: Map<string, string | undefined>;
}

export interface Schema {
	type?: string;
	description?: string;
	properties?: Record<string, Schema>;
	items?: Schema;
	additionalProperties?: Schema | boolean;
	anyOf?: Schema[];
	required?: string[];
	[key: string]: unknown;
}

const DEPTH_MAX = 8;

const isLiteralPart = (part: string): boolean =>
	QUOTE_START.test(part) &&
	!(part.startsWith("`") && part.replace(/\\[\s\S]/g, "").includes("${"));

const literalText = (expr: string): string =>
	splitPlus(expr.trim()).filter(isLiteralPart).map(unquote).join("");

export const inlineBlock = (expr: string): string | null => {
	const m = LET_BINDING.exec(expr);
	if (!m || matchClose(expr, 0) !== expr.length - 1) {
		return null;
	}
	const name = m[1] ?? "";
	const valueEnd = exprEnd(expr, m[0].length);
	const value = expr.slice(m[0].length, valueEnd);
	const ret = RETURN_PREFIX.exec(expr.slice(valueEnd));
	if (!ret) {
		return null;
	}
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
	if (inlined !== null) {
		return typeSchema(inlined, ctx, depth, isProp);
	}
	const { head, headArgs = "", calls } = chainCalls(expr);
	const kind = kindOf(ctx, head);
	const out: Schema = {};
	let schema: Schema | undefined;
	if (kind === "string" || kind === "boolean") {
		schema = { type: kind };
	} else if (kind === "number") {
		schema = { type: "number" };
	} else if (kind === "const") {
		schema = constSchema(headArgs);
	} else if (kind === "enum") {
		schema = enumSchema(headArgs);
	} else if (kind === "array") {
		schema = { type: "array", items: typeSchema(headArgs, ctx, depth + 1) };
	} else if (kind === "record") {
		schema = recordSchema(headArgs, ctx, depth);
	} else if (kind === "union") {
		schema = unionSchema(headArgs, ctx, depth);
	} else if (kind === "object") {
		schema = objectSchema(headArgs, ctx, depth, calls);
	} else if (kind === "lazy") {
		schema = lazySchema(headArgs, ctx, depth);
	} else {
		schema = isProp ? plainRefSchema(head, headArgs, ctx, depth) : {};
	}
	Object.assign(out, schema);
	for (const [name, args] of calls) {
		applyCall(out, name, args);
	}
	return out;
};

const constSchema = (args: string): Schema => {
	const t = args.trim();
	return QUOTED_START.test(t) ? { const: unquote(t) } : {};
};

const enumSchema = (args: string): Schema => {
	const items = splitTop(args.replace(/^\[|\]$/g, ""));
	const values = items.filter((s) => QUOTE_START_DS.test(s)).map(unquote);
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
	return kindOf(ctx, head) !== undefined && !OPTIONAL_CALL.test(expr);
};

const objectSchema = (
	args: string,
	ctx: Ctx,
	depth: number,
	calls: Call[],
): Schema => {
	if (!args.trim().startsWith("{")) {
		return { type: "object" };
	}
	const props: Record<string, Schema> = {};
	const required: string[] = [];
	for (const [key, expr] of parseEntries(args.trim().slice(1, -1), false)) {
		props[key] = typeSchema(expr, ctx, depth + 1, true);
		if (isRequired(expr, ctx)) {
			required.push(key);
		}
	}
	const open = calls.some(([name]) => name === "passthrough");
	const out: Schema = { type: "object", properties: props };
	if (required.length > 0) {
		out.required = required;
	}
	if (!open) {
		out.additionalProperties = false;
	}
	return out;
};

// A name that the module imports is defined in the module that exports it, where its helpers resolve.
// The bundle reuses short names, so `g6` can name three different values in three modules.
const moduleOf = (ctx: Ctx, name: string): { ctx: Ctx; name: string } => {
	const scope = importOf(ctx, name);
	if (scope === undefined) {
		return { ctx, name };
	}
	ctx.modules ??= new Map();
	let inner = ctx.modules.get(scope);
	if (inner === undefined) {
		const bundle = ctx.bundle ?? ctx.src;
		inner = {
			src: scope.text,
			bundle,
			stack: ctx.stack,
			scopes: scopesIn(bundle, scope.text),
		};
		ctx.modules.set(scope, inner);
	}
	return { ctx: inner, name: scope.local };
};

const follow = (
	name: string,
	unique: boolean,
	outer: Ctx,
	depth: number,
): Schema => {
	const { ctx, name: local } = moduleOf(outer, name);
	const key = `${ctx.src.length}:${local}`;
	if (depth > DEPTH_MAX || ctx.stack.has(key)) {
		return {};
	}
	const body = findDefinition(ctx, local, unique);
	if (body === null) {
		return {};
	}
	ctx.stack.add(key);
	const out = typeSchema(body, ctx, depth + 1);
	ctx.stack.delete(key);
	return out;
};

// A record or array item is not followed, because `A(Wo())` named a different `Wo` in the bundle.
const plainRefSchema = (
	head: string,
	args: string,
	ctx: Ctx,
	depth: number,
): Schema =>
	args.trim() !== "" || !IDENT_ONLY.test(head)
		? {}
		: follow(head, true, ctx, depth);

const lazySchema = (args: string, ctx: Ctx, depth: number): Schema => {
	const inline = THUNK_INLINE.exec(args.trim());
	const m = THUNK_CALL.exec(args.trim());
	if (inline && m && kindOf(ctx, m[1] ?? "") !== undefined) {
		return typeSchema(inline[1] ?? "", ctx, depth + 1);
	}
	return m ? follow(m[1] ?? "", false, ctx, depth) : {};
};

const applyCall = (out: Schema, name: string, args: string): void => {
	if (name === "describe") {
		const text = literalText(args);
		if (text) {
			out.description = text;
		}
	} else if (name === "min" && isNumber(out) && NUMBER_START.test(args)) {
		out["minimum"] = Number(args);
	} else if (name === "max" && isNumber(out) && NUMBER_START.test(args)) {
		out["maximum"] = Number(args);
	} else if (name === "int" && isNumber(out)) {
		out.type = "integer";
	}
};

const isNumber = (schema: Schema): boolean =>
	schema.type === "number" || schema.type === "integer";
