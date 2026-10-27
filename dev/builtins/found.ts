// The shared parts of the extractors: the types, the maps of found parts, and the readers of minified names.

const UPPER_START = /^[A-Z]/;

export const GROUPS = [
	"commands",
	"plugins",
	"attachments",
	"sections",
	"tools",
	"agents",
	"compaction",
	"attribution",
	"git",
	"statusline",
	"skills",
	"servertools",
] as const;
export type Group = (typeof GROUPS)[number];
export interface Part {
	group: Group;
	name: string;
	bytes: number | null;
	/** The static text of a part, kept for the `sections` group only. */
	text?: string | undefined;
}

export type Found = Map<string, number | null>;
export const keep = (m: Found, name: string, bytes: number | null) => {
	const old = m.get(name);
	if (old == null || bytes == null) {
		m.set(name, old ?? bytes);
		return;
	}
	m.set(name, Math.max(old, bytes));
};
export const parts = (
	group: Group,
	m: Found,
	texts?: Map<string, string>,
): Part[] =>
	[...m].map(([name, bytes]) => ({
		group,
		name,
		bytes,
		text: texts?.get(name),
	}));
export const esc = (id: string) => id.replace(/\$/g, "\\$");
/** The callee that shows most often in group 1 of `re`: a minifier renames a function, but it keeps one name for all calls. */
export const callee = (t: string, re: RegExp): string | undefined => {
	const n = new Map<string, number>();
	for (const m of t.matchAll(re)) {
		n.set(m[1] ?? "", (n.get(m[1] ?? "") ?? 0) + 1);
	}
	return [...n].sort((a, b) => b[1] - a[1])[0]?.[0];
};

export const TOOL = /^(?:[A-Z][A-Za-z]+|[a-z]+(?:_[a-z]+)+)$/;
export const KEBAB = /^[a-z][a-z0-9]*(?:[:-][a-z0-9]+)*$/;
export const SKIP = /Exception|Error|API|^tengu_/;
const defs = new Map<string, [number, string][]>();
let defsOf: string | undefined;
/**
 * The string that the minified constant `id` holds at the place `at`, when it fits `shape`.
 * A name repeats across chunks, so it is the nearest definition `id="value"` within 150 KB,
 * and else the one with a PascalCase value first and then the most used value.
 */
export const constName = (
	t: string,
	id: string,
	at: number,
	shape: RegExp,
): string | undefined => {
	if (defsOf !== t) {
		defs.clear();
		defsOf = t;
		for (const m of t.matchAll(
			/[\s,;{(]([A-Za-z_$][\w$]*)="([A-Za-z][\w:-]*)"(?=[,;])/g,
		)) {
			const list = defs.get(m[1] ?? "") ?? [];
			list.push([m.index, m[2] ?? ""]);
			defs.set(m[1] ?? "", list);
		}
	}
	const own = (defs.get(id) ?? []).filter(
		([, v]) => shape.test(v) && !SKIP.test(v),
	);
	const near = own
		.filter(([p]) => Math.abs(p - at) < 150_000)
		.sort((a, b) => Math.abs(a[0] - at) - Math.abs(b[0] - at))[0];
	const used = (v: string) => t.split(`"${v}"`).length;
	return (near ??
		own.sort(
			(a, b) =>
				Number(UPPER_START.test(b[1])) - Number(UPPER_START.test(a[1])) ||
				used(b[1]) - used(a[1]),
		)[0])?.[1];
};

/** The `{` that opens the object which holds the index `k`, found by a count of braces backwards (a rough scan, that skips no strings). */
export const openOf = (t: string, k: number): number => {
	for (let i = k, depth = 0; i > k - 8000; i--) {
		if (t[i] === "}") {
			depth++;
		} else if (t[i] === "{" && depth-- === 0) {
			return i;
		}
	}
	return k;
};

/** The name that the key `name:` holds at the top level of the object at `open`: a literal, or a constant that fits `shape`. */
export const nameOf = (
	t: string,
	open: number,
	shape: RegExp,
): string | undefined => {
	for (const m of t
		.slice(open, open + 1200)
		.matchAll(/[,{]name:("[a-z][a-z0-9:-]*"|[A-Za-z_$][\w$]+),/g)) {
		const before = t
			.slice(open, open + m.index + 1)
			.replace(/"(?:[^"\\]|\\.)*"/g, "");
		if (
			(before.match(/[{([]/g)?.length ?? 0) -
				(before.match(/[})\]]/g)?.length ?? 0) !==
			1
		) {
			continue;
		}
		const v = m[1] ?? "";
		return v.startsWith('"') ? v.slice(1, -1) : constName(t, v, open, shape);
	}
	return undefined;
};
