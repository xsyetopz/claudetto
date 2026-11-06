import { parseArgs } from "node:util";
import {
	cachePrefix,
	checkSnap,
	diffParts,
	groupOf,
	lineDiff,
	loadRequests,
	newText,
	type Part,
	pickRequest,
	splitRequest,
	toolSizes,
} from "./capture.ts";

export const CAPTURE_HELP = `claudekit capture <command> ...

A request is PATH[@WHICH]. PATH is a folder of NNNN.json bodies or a JSONL file of bodies.
WHICH is first, last, largest (the default), or an index; a negative index counts from the end.

  split REQ [--normalize]            parts of one request: key, kind, bytes, tokens, cache
  diff A B [--normalize]             parts added, removed, or changed, and which group changed
  diff A B --lines [--width N]       lines added (+) and removed (-) per group: system, messages, each tool
  diff A B --new                     text blocks of B that no part of A holds
  prefix PATH                        per request: cache breakpoints, first block that differs from the
                                     request before, and the longest earlier cache entry it reuses
  tools A B                          bytes per tool, its description and schema, A against B
  snap REQ FILE [--update]           compare the normalized request with a .snap; write only with --update
`;

export const captureCommand = async (argv: string[]): Promise<string> => {
	const { values, positionals } = parseArgs({
		args: argv,
		allowPositionals: true,
		options: {
			normalize: { type: "boolean", default: false },
			lines: { type: "boolean", default: false },
			new: { type: "boolean", default: false },
			update: { type: "boolean", default: false },
			width: { type: "string", default: "160" },
			help: { type: "boolean", default: false },
		},
	});
	const [command, ...rest] = positionals;
	if (values.help || !command) {
		return CAPTURE_HELP;
	}
	const norm = values.normalize ? { normalize: {} } : {};
	switch (command) {
		case "split":
			return splitRequest(await request(arg(rest, 0)), norm).map(partLine).join("\n");
		case "diff": {
			const [a, b] = await Promise.all([request(arg(rest, 0)), request(arg(rest, 1))]);
			const [pa, pb] = [splitRequest(a, norm), splitRequest(b, norm)];
			return values.new ? newBlocks(pa, pb) : values.lines ? lines(pa, pb, Number(values.width)) : parts(pa, pb);
		}
		case "prefix":
			return prefix(await loadRequests(arg(rest, 0)));
		case "tools":
			return tools(await request(arg(rest, 0)), await request(arg(rest, 1)));
		case "snap": {
			const r = await checkSnap(arg(rest, 1), splitRequest(await request(arg(rest, 0)), { normalize: {} }), {
				update: values.update,
			});
			return [`snapshot ${r.status}`, ...r.diff.map(diffLine)].join("\n");
		}
		default:
			throw new Error(`capture command ${JSON.stringify(command)}: unknown; see claudekit capture --help`);
	}
};

const arg = (rest: string[], i: number): string => {
	const v = rest[i];
	if (v === undefined) {
		throw new Error(`argument ${i + 1}: missing; see claudekit capture --help`);
	}
	return v;
};

const request = async (spec: string): Promise<unknown> => {
	const at = spec.lastIndexOf("@");
	const [path, which] = at > 0 ? [spec.slice(0, at), spec.slice(at + 1)] : [spec, "largest"];
	return pickRequest(await loadRequests(path), which);
};

const partLine = (p: Part): string => `${p.key}\t${p.kind}\t${p.bytes}\t${p.tokens}${p.cache ? `\t${p.cache}` : ""}`;

const diffLine = (d: ReturnType<typeof diffParts>[number]): string => {
	const head = `${d.change} ${d.key} bytes ${d.bytes[0]} -> ${d.bytes[1]} (${signed(d.bytesDelta)}), tokens ${signed(d.tokensDelta)}`;
	const cache = d.cache ? `\n  cache ${d.cache[0] ?? "none"} -> ${d.cache[1] ?? "none"}` : "";
	const text = d.at === undefined ? "" : `\n  at ${d.at}: ${JSON.stringify(d.was)}\n  =>    ${JSON.stringify(d.now)}`;
	return head + cache + text;
};

const parts = (a: Part[], b: Part[]): string => {
	const diff = diffParts(a, b);
	const changed = new Set(diff.map((d) => groupOf(d.key).replace(/^tool:.*/, "tools")));
	const groups = ["head", "tools", "system", "messages"].map((g) => `${g} ${changed.has(g) ? "different" : "identical"}`);
	return [...groups, ...diff.map(diffLine)].join("\n");
};

const lines = (a: Part[], b: Part[], width: number): string =>
	lineDiff(a, b)
		.map((d) => {
			const mark = d.status === "new" ? " (new)" : d.status === "gone" ? " (gone)" : "";
			const body = [...d.added.map((l) => `+ ${l.slice(0, width)}`), ...d.removed.map((l) => `- ${l.slice(0, width)}`)];
			return [`## ${d.group}${mark}`, ...body].join("\n");
		})
		.join("\n");

const newBlocks = (a: Part[], b: Part[]): string =>
	newText(a, b)
		.filter((p) => p.kind !== "head" && p.kind !== "tool" && p.kind !== "system")
		.map((p) => `--- ${p.key} ${p.text.length} chars\n${p.text}`)
		.join("\n");

const prefix = (bodies: unknown[]): string =>
	cachePrefix(bodies)
		.map((r) => {
			const last = Math.max(0, ...r.breakpoints);
			const best = r.best ? `req ${r.best.from} at ${r.best.length} (lookback ${last - r.best.length} blocks)` : "none";
			return `req ${r.index}: messages ${r.messages}, blocks ${r.blocks}, breakpoints ${JSON.stringify(r.breakpoints)}, same head ${r.sameHead ?? "-"}, first diff vs previous ${r.firstDiffVsPrevious ?? "none"}, best earlier entry ${best}, ${r.sharedCharsPercent}% of chars`;
		})
		.join("\n");

const tools = (a: unknown, b: unknown): string => {
	const [ta, tb] = [toolSizes(a), toolSizes(b)];
	const byName = new Map(tb.map((t) => [t.name, t]));
	const names = [...new Set([...ta.map((t) => t.name), ...tb.map((t) => t.name)])];
	const rows = names.map((n) => {
		const x = ta.find((t) => t.name === n);
		const y = byName.get(n);
		const cell = (f: (t: (typeof ta)[number]) => number) => `${x ? f(x) : "-"}/${y ? f(y) : "-"}`;
		return `${n}\tbytes ${cell((t) => t.bytes)} (${signed((y?.bytes ?? 0) - (x?.bytes ?? 0))})\tdescription ${cell((t) => t.descriptionBytes)}\tschema ${cell((t) => t.schemaBytes)}`;
	});
	const sum = (ts: typeof ta, sent: boolean) => ts.filter((t) => !(sent && t.deferred)).reduce((s, t) => s + t.bytes, 0);
	return [...rows, `all tools ${sum(ta, false)} -> ${sum(tb, false)}; sent (not deferred) ${sum(ta, true)} -> ${sum(tb, true)}`].join("\n");
};

const signed = (n: number): string => (n > 0 ? `+${n}` : String(n));
