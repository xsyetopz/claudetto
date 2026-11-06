import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { tokensFor } from "../fake/plan.ts";
import { blockText } from "../shared/blocks.ts";
import { isRecord } from "../shared/record.ts";

const REMINDER = "<system-reminder>";
const SKIP_FILE = /\.(headers|meta)\.json$|^plan\.json$/;
const HEAD_KEYS = ["model", "thinking", "output_config", "context_management"] as const;
const CONTEXT = 60;
const SNAP_HEAD = /^=== (\S+) kind=(\S+) bytes=(\d+) tokens=(\d+)(?: cache=(.*))?$/;
const SCRUB: [RegExp, string][] = [
	[/(?:\/private)?\/var\/folders\/[^\s"'`)\\]+/g, "<tmp>"],
	[/\/tmp\/[^\s"'`)\\]+/g, "<tmp>"],
	[/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, "<uuid>"],
	[/\b(msg|toolu|srvtoolu|req)_[A-Za-z0-9_]+/g, "$1_<id>"],
	[/\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z?/g, "<time>"],
	[/\b\d{4}-\d\d-\d\d\b/g, "<date>"],
	[/cc_version=[^;\s"\\]+/g, "cc_version=<v>"],
	[/<total_tokens>[^<]*<\/total_tokens>/g, "<total_tokens><n></total_tokens>"],
	[/\b[0-9a-f]{64}\b/g, "<hex>"],
];

export type PartKind = "head" | "system" | "tool" | "text" | "reminder" | "tool_use" | "tool_result" | "other";

export interface Part {
	key: string;
	kind: PartKind;
	text: string;
	bytes: number;
	// Estimated at the fake's characters-per-token ratio, not counted by the API.
	tokens: number;
	cache?: string;
}

export interface PartDiff {
	key: string;
	change: "added" | "removed" | "changed";
	bytes: [number, number];
	bytesDelta: number;
	tokensDelta: number;
	at?: number;
	was?: string;
	now?: string;
	cache?: [string | undefined, string | undefined];
}

export interface LineDiff {
	group: string;
	status: "changed" | "new" | "gone";
	added: string[];
	removed: string[];
}

export interface PrefixRow {
	index: number;
	messages: number;
	blocks: number;
	breakpoints: number[];
	sameHead: boolean | undefined;
	// undefined when the shorter of the two requests is a prefix of the longer.
	firstDiffVsPrevious: number | undefined;
	best: { from: number; length: number } | undefined;
	sharedCharsPercent: number;
}

export interface ToolSize {
	name: string;
	bytes: number;
	descriptionBytes: number;
	schemaBytes: number;
	deferred: boolean;
}

export interface SnapResult {
	status: "same" | "changed" | "missing" | "written";
	diff: PartDiff[];
}

export const normalize = (text: string, ctx: { paths?: string[] } = {}): string => {
	let out = text;
	for (const p of [...(ctx.paths ?? [])].sort((a, b) => b.length - a.length)) {
		out = out.replaceAll(p, "<path>");
	}
	return SCRUB.reduce((s, [re, to]) => s.replace(re, to), out);
};

export const loadRequests = async (source: string): Promise<unknown[]> => {
	if ((await stat(source)).isDirectory()) {
		const names = (await readdir(source)).filter((f) => f.endsWith(".json") && !SKIP_FILE.test(f)).sort();
		return Promise.all(names.map((f) => Bun.file(join(source, f)).json()));
	}
	const lines = (await Bun.file(source).text()).split("\n").filter((l) => l.trim());
	return lines.map((l) => JSON.parse(l) as unknown).filter((b) => isRecord(b) && Array.isArray(b.messages));
};

// "first", "last", "largest", or an index; a negative index counts from the end.
export const pickRequest = (bodies: unknown[], which: string): unknown => {
	if (which === "largest") {
		return bodies.reduce((a, b) => (JSON.stringify(b).length > JSON.stringify(a).length ? b : a));
	}
	const i = which === "first" ? 0 : which === "last" ? -1 : Number(which);
	const body = Number.isInteger(i) ? bodies.at(i) : undefined;
	if (body === undefined) {
		throw new Error(`request ${which}: none of ${bodies.length}`);
	}
	return body;
};

export const splitRequest = (body: unknown, opts: { normalize?: { paths?: string[] } } = {}): Part[] => {
	const b = isRecord(body) ? body : {};
	const raw: Omit<Part, "bytes" | "tokens">[] = [
		{ key: "head", kind: "head", text: JSON.stringify(Object.fromEntries(HEAD_KEYS.map((k) => [k, b[k]]))) },
		...list(b.tools).map((t) => ({ key: `tool:${String(t.name)}`, kind: "tool" as const, text: json(t), ...cacheOf(t) })),
		...blocksOf(b.system).map((s, i) => ({ key: `system[${i}]`, kind: "system" as const, text: textOf(s), ...cacheOf(s) })),
		...list(b.messages).flatMap((m, i) =>
			blocksOf(m.content).map((c, j) => {
				const kind = kindOf(c);
				return { key: `msg[${i}]:${String(m.role)}:${kind}[${j}]`, kind, text: textOf(c), ...cacheOf(c) };
			}),
		),
	];
	return raw.map((p) => {
		const text = opts.normalize ? normalize(p.text, opts.normalize) : p.text;
		const bytes = Buffer.byteLength(text);
		return { ...p, text, bytes, tokens: bytes === 0 ? 0 : tokensFor(bytes) };
	});
};

export const diffParts = (a: Part[], b: Part[]): PartDiff[] => {
	const before = new Map(a.map((p) => [p.key, p]));
	const after = new Map(b.map((p) => [p.key, p]));
	const out: PartDiff[] = [];
	for (const key of new Set([...before.keys(), ...after.keys()])) {
		const x = before.get(key);
		const y = after.get(key);
		if (x && y && x.text === y.text && x.cache === y.cache) {
			continue;
		}
		out.push(partDiff(key, x, y));
	}
	return out;
};

// Parts of b whose text appears in no part of a, wherever it sits.
export const newText = (a: Part[], b: Part[]): Part[] => {
	const seen = new Set(a.map((p) => p.text));
	return b.filter((p) => !seen.has(p.text));
};

export const groupOf = (key: string): string =>
	key.startsWith("msg[") ? "messages" : key.startsWith("system[") ? "system" : key;

export const lineDiff = (a: Part[], b: Part[]): LineDiff[] => {
	const ga = groupLines(a);
	const gb = groupLines(b);
	const out: LineDiff[] = [];
	for (const group of new Set([...ga.keys(), ...gb.keys()])) {
		const x = count(ga.get(group) ?? []);
		const y = count(gb.get(group) ?? []);
		const added = surplus(y, x);
		const removed = surplus(x, y);
		if (added.length + removed.length > 0) {
			out.push({ group, status: !ga.has(group) ? "new" : !gb.has(group) ? "gone" : "changed", added, removed });
		}
	}
	return out;
};

export const cachePrefix = (bodies: unknown[]): PrefixRow[] => {
	const reqs = bodies.map((body) => {
		const parts = splitRequest(body);
		const blocks = parts.filter((p) => p.kind !== "head");
		return {
			head: parts[0]?.text,
			blocks: blocks.map((p) => `${p.key}\0${p.text}`),
			breakpoints: blocks.flatMap((p, i) => (p.cache ? [i + 1] : [])),
			messages: list(isRecord(body) ? body.messages : []).length,
		};
	});
	return reqs.map((r, k) => {
		let best: PrefixRow["best"];
		for (const [j, prev] of reqs.slice(0, k).entries()) {
			for (const bp of prev.head === r.head ? prev.breakpoints : []) {
				if (bp <= r.blocks.length && bp > (best?.length ?? 0) && sameUpTo(prev.blocks, r.blocks, bp)) {
					best = { from: j, length: bp };
				}
			}
		}
		const total = r.blocks.join("").length;
		const shared = r.blocks.slice(0, best?.length ?? 0).join("").length;
		const previous = reqs[k - 1];
		return {
			index: k,
			messages: r.messages,
			blocks: r.blocks.length,
			breakpoints: r.breakpoints,
			sameHead: previous ? previous.head === r.head : undefined,
			firstDiffVsPrevious: previous ? firstDiff(previous.blocks.slice(0, r.blocks.length), r.blocks.slice(0, previous.blocks.length)) : undefined,
			best,
			sharedCharsPercent: total === 0 ? 0 : Math.round((shared / total) * 1000) / 10,
		};
	});
};

export const toolSizes = (body: unknown): ToolSize[] =>
	list(isRecord(body) ? body.tools : []).map((t) => ({
		name: String(t.name),
		bytes: Buffer.byteLength(JSON.stringify(t)),
		descriptionBytes: Buffer.byteLength(typeof t.description === "string" ? t.description : ""),
		schemaBytes: Buffer.byteLength(JSON.stringify(t.input_schema ?? null)),
		deferred: t.defer_loading === true,
	}));

export const toSnap = (parts: Part[]): string =>
	parts
		.map((p) => {
			const head = `=== ${p.key} kind=${p.kind} bytes=${p.bytes} tokens=${p.tokens}${p.cache ? ` cache=${p.cache}` : ""}`;
			return [head, ...p.text.split("\n").map((l) => `| ${l}`)].join("\n");
		})
		.join("\n")
		.concat("\n");

export const parseSnap = (snap: string): Part[] => {
	const parts: Part[] = [];
	const lines: string[] = [];
	for (const line of snap.split("\n")) {
		const m = SNAP_HEAD.exec(line);
		if (m) {
			parts.push({ key: m[1] as string, kind: m[2] as PartKind, text: "", bytes: Number(m[3]), tokens: Number(m[4]), ...(m[5] ? { cache: m[5] } : {}) });
			lines.length = 0;
		} else if (line.startsWith("| ") || line === "|") {
			lines.push(line.slice(2));
			(parts.at(-1) as Part).text = lines.join("\n");
		} else if (line !== "") {
			throw new Error(`snapshot line not understood: ${JSON.stringify(line)}`);
		}
	}
	return parts;
};

export const checkSnap = async (file: string, parts: Part[], opts: { update: boolean }): Promise<SnapResult> => {
	const f = Bun.file(file);
	const exists = await f.exists();
	const diff = exists ? diffParts(parseSnap(await f.text()), parts) : [];
	if (opts.update && (!exists || diff.length > 0)) {
		await Bun.write(file, toSnap(parts));
		return { status: "written", diff };
	}
	return { status: !exists ? "missing" : diff.length > 0 ? "changed" : "same", diff };
};

const list = (v: unknown): Record<string, unknown>[] => (Array.isArray(v) ? v.filter(isRecord) : []);

const blocksOf = (content: unknown): Record<string, unknown>[] =>
	typeof content === "string" ? [{ type: "text", text: content }] : list(content);

const kindOf = (c: Record<string, unknown>): PartKind =>
	c.type === "text"
		? String(c.text).startsWith(REMINDER)
			? "reminder"
			: "text"
		: c.type === "tool_use" || c.type === "tool_result"
			? c.type
			: "other";

const textOf = (c: Record<string, unknown>): string =>
	c.type === "text"
		? String(c.text)
		: c.type === "tool_result"
			? resultText(c.content)
			: c.type === "tool_use"
				? json({ name: c.name, input: c.input })
				: json(c);

// A result block without text, such as a tool_reference, is kept as JSON so its content still diffs.
const resultText = (content: unknown): string =>
	Array.isArray(content)
		? list(content)
				.map((b) => (b.type === "text" ? blockText([b]) : json(b)))
				.join("\n")
		: blockText(content);

const json = (v: unknown): string => JSON.stringify(v, (k, x) => (k === "cache_control" ? undefined : x));

const cacheOf = (c: Record<string, unknown>): { cache?: string } =>
	c.cache_control ? { cache: JSON.stringify(c.cache_control) } : {};

const partDiff = (key: string, x: Part | undefined, y: Part | undefined): PartDiff => {
	const bytes: [number, number] = [x?.bytes ?? 0, y?.bytes ?? 0];
	const base = { key, bytes, bytesDelta: bytes[1] - bytes[0], tokensDelta: (y?.tokens ?? 0) - (x?.tokens ?? 0) };
	if (!(x && y)) {
		return { ...base, change: x ? "removed" : "added" };
	}
	const at = firstDiff([...x.text], [...y.text]);
	const from = Math.max(0, (at ?? 0) - CONTEXT);
	return {
		...base,
		change: "changed",
		...(at === undefined
			? {}
			: { at, was: x.text.slice(from, at + CONTEXT), now: y.text.slice(from, at + CONTEXT) }),
		...(x.cache === y.cache ? {} : { cache: [x.cache, y.cache] }),
	};
};

const firstDiff = (a: string[], b: string[]): number | undefined => {
	const n = Math.min(a.length, b.length);
	for (let i = 0; i < n; i++) {
		if (a[i] !== b[i]) {
			return i;
		}
	}
	return a.length === b.length ? undefined : n;
};

const sameUpTo = (a: string[], b: string[], n: number): boolean => a.slice(0, n).every((x, i) => x === b[i]);

// JSON parts are pretty-printed with their escaped newlines opened, so a changed description diffs by line.
const groupLines = (parts: Part[]): Map<string, string[]> => {
	const out = new Map<string, string[]>();
	for (const p of parts.filter((x) => x.kind !== "head")) {
		const text = p.kind === "tool" ? JSON.stringify(JSON.parse(p.text), null, 1).replace(/\\n/g, "\n") : p.text;
		const group = groupOf(p.key);
		out.set(group, [...(out.get(group) ?? []), ...text.split("\n")]);
	}
	return out;
};

const count = (lines: string[]): Map<string, number> =>
	lines.reduce((m, l) => (l.trim() ? m.set(l, (m.get(l) ?? 0) + 1) : m), new Map<string, number>());

const surplus = (a: Map<string, number>, b: Map<string, number>): string[] =>
	[...a].filter(([l, n]) => n > (b.get(l) ?? 0)).map(([l]) => l);
