// Finds the definition of a name in the bundle: the arrow functions and `function` declarations that return a shape.

import { kindOf } from "./helpers.ts";
import { exprEnd, findSchemaStart } from "./scan.ts";
import type { Ctx } from "./types.ts";

const IDENT_CHAR = /[\w$]/;
const IDENT_PREFIX = /^[\w$]+/;
const SEPARATOR_CHAR = /[,;\s]/;

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
	if (from === undefined || !shaped.includes(from)) {
		return null;
	}
	if (unique && shaped.length > 1) {
		return null;
	}
	return src.slice(from, exprEnd(src, from));
};

export type Hit = [string, number, number];

/** The names that an arrow function or a `function` returning an expression defines, with the start and the end of the head. */
const arrowHits = (src: string, limit: number): Hit[] => {
	const hits: Hit[] = [];
	for (const m of src.matchAll(/=(?:[fp]\(\(\)=>|\(\)=>|\([\w$,]*\)=>)/g)) {
		let at = m.index;
		while (at > 0 && IDENT_CHAR.test(src[at - 1] ?? "")) {
			at--;
		}
		const start = at - 1;
		if (at === m.index || start < 0 || start >= limit) {
			continue;
		}
		if (!SEPARATOR_CHAR.test(src[start] ?? "")) {
			continue;
		}
		hits.push([src.slice(at, m.index), start, m.index + m[0].length]);
	}
	return hits;
};

// The bundle is about 240 MB and one pass costs about 80 ms, so 2 passes for all names replace 24 passes for each name.
const definitions = (src: string): Map<string, number[]> => {
	const anchor = findSchemaStart(src);
	const limit = anchor < 0 ? src.length : anchor;
	const hits: Hit[] = [];
	for (const m of src.matchAll(/function ([\w$]+)\([^)]*\)\{return /g)) {
		if (m.index < limit) {
			hits.push([m[1] ?? "", m.index, m.index + m[0].length]);
		}
	}
	hits.push(...arrowHits(src, limit));
	const defs = new Map<string, number[]>();
	for (const [name, , end] of hits.sort((a, b) => a[1] - b[1])) {
		const ends = defs.get(name);
		if (ends) {
			ends.push(end);
		} else {
			defs.set(name, [end]);
		}
	}
	return defs;
};

const isShape = (ctx: Ctx, at: number): boolean => {
	const name = IDENT_PREFIX.exec(ctx.src.slice(at, at + 8))?.[0];
	if (name === undefined || ctx.src[at + name.length] !== "(") {
		return false;
	}
	const kind = kindOf(ctx, name);
	return kind !== undefined && ["object", "record"].includes(kind);
};
