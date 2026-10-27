// Applies the graders of an eval case to a recorded transcript.
// A transcript is `{ events, files }`: the stream-json events of a run, and the files that the run left.
// It supports the grader types `regex` (the last message, the trace, or a file), `tool_used`, and `tool_order`, which the agent evals use.
// It skips the grader type `llm`, because a judge needs a model.
// `graderFaults` lists each grader type or field that it does not model, and `failedGraders` throws on them, so a grader never passes or fails by a guess.
// The default `min` of a `tool_used` grader is 1, which is an assumption of this helper.
// It also counts the tool calls and the tokens of a run, for the budget tags of a case (D25).

/** A grader of a case file, as the YAML holds it. */
export interface Grader {
	name: string;
	type: string;
	target?: { source: string; path: string } | "trace";
	pattern?: string;
	flags?: string;
	match?: string;
	tool?: string;
	input_match?: string;
	min?: number;
	max?: number;
	before?: ToolMatch;
	after?: ToolMatch;
}

/** A tool name, or a tool name with a regex for the JSON of its input, as a `tool_order` grader holds it. */
type ToolMatch = string | { tool: string; input_match?: string };

/** A recorded run. A bad run also names the grader that it must fail, in `fails`. */
export interface Transcript {
	fails?: string;
	events: {
		type: string;
		result?: string;
		usage?: { input_tokens?: number; output_tokens?: number };
		message?: {
			content?: {
				type: string;
				text?: string;
				name?: string;
				input?: unknown;
			}[];
		};
	}[];
	files: Record<string, string>;
}

/** The fields that each grader type models. A field outside the list is a fault of `graderFaults`. */
const FIELDS: Record<string, string[]> = {
	regex: ["target", "pattern", "flags", "match"],
	tool_used: ["tool", "input_match", "min", "max"],
	tool_order: ["before", "after"],
	llm: ["criteria", "focus"],
};

/** True when a `target` is `trace`, a file target, or absent. */
const targetModelled = (t: unknown): boolean =>
	t === undefined ||
	t === "trace" ||
	(typeof t === "object" && t !== null && "source" in t && t.source === "file");

/** The faults of the missing fields of a grader of a known type. */
const neededFieldFaults = (g: Grader): string[] => {
	if (g.type === "regex" && typeof g.pattern !== "string") {
		return [`grader ${g.name}: a regex grader needs a pattern`];
	}
	if (g.type === "tool_used" && typeof g.tool !== "string") {
		return [`grader ${g.name}: a tool_used grader needs a tool`];
	}
	if (g.type === "tool_order" && (!g.before || !g.after)) {
		return [`grader ${g.name}: a tool_order grader needs before and after`];
	}
	return [];
};

/** The faults of one grader. */
const oneGraderFaults = (g: Grader): string[] => {
	const known = FIELDS[g.type];
	if (!known) {
		return [`grader ${g.name}: unmodelled type ${g.type}`];
	}
	const out = Object.keys(g)
		.filter((k) => k !== "name" && k !== "type" && !known.includes(k))
		.map((k) => `grader ${g.name}: unmodelled field ${k}`);
	if (!targetModelled(g.target)) {
		out.push(`grader ${g.name}: unmodelled target`);
	}
	if (
		g.match !== undefined &&
		g.match !== "contains" &&
		g.match !== "not_contains"
	) {
		out.push(`grader ${g.name}: unmodelled match ${g.match}`);
	}
	return [...out, ...neededFieldFaults(g)];
};

/** The faults of the graders that this helper does not model, or that miss a field it needs. */
export const graderFaults = (graders: Grader[]): string[] =>
	graders.flatMap(oneGraderFaults);

interface Call {
	name?: string;
	input?: unknown;
}

/** True when a `regex` grader fails on a run. */
const regexFails = (g: Grader, run: Transcript, last: string): boolean => {
	// The trace is the events as JSON lines, as the live `trace` target reads them.
	const traceText = () => run.events.map((e) => JSON.stringify(e)).join("\n");
	const textOf = (): string => {
		if (g.target === undefined) {
			return last;
		}
		if (g.target === "trace") {
			return traceText();
		}
		return run.files[g.target.path] ?? "";
	};
	const found = new RegExp(g.pattern ?? "", g.flags ?? "").test(textOf());
	// A `not_contains` grader passes when the regex finds nothing.
	return g.match === "not_contains" ? found : !found;
};

/** True when a `tool_order` grader fails on the calls of a run. */
const orderFails = (g: Grader, calls: Call[]): boolean => {
	const at = (m: ToolMatch) => {
		const { tool, input_match } =
			typeof m === "string" ? { tool: m, input_match: undefined } : m;
		const re = input_match ? new RegExp(input_match) : undefined;
		return calls.findIndex(
			(c) => c.name === tool && (!re || re.test(JSON.stringify(c.input))),
		);
	};
	// Both must be called, and the first `before` call comes strictly before the first `after` call, as in the live grader.
	if (!g.before || !g.after) {
		return true;
	}
	const first = at(g.before);
	const second = at(g.after);
	return first < 0 || second < 0 || first >= second;
};

/** True when a `tool_used` grader fails on the calls of a run. */
const usedFails = (g: Grader, calls: Call[]): boolean => {
	const match = g.input_match ? new RegExp(g.input_match) : undefined;
	const n = calls.filter(
		(c) => c.name === g.tool && (!match || match.test(JSON.stringify(c.input))),
	).length;
	return n < (g.min ?? 1) || n > (g.max ?? Number.POSITIVE_INFINITY);
};

/** The names of the graders that fail on a transcript. */
export const failedGraders = (graders: Grader[], run: Transcript): string[] => {
	const faults = graderFaults(graders);
	if (faults.length > 0) {
		throw new Error(faults.join("\n"));
	}
	const calls = run.events.flatMap((e) =>
		(e.message?.content ?? []).filter((b) => b.type === "tool_use"),
	);
	const last = run.events.findLast((e) => e.type === "result")?.result ?? "";
	const fails = (g: Grader): boolean => {
		if (g.type === "llm") {
			return false;
		}
		if (g.type === "regex") {
			return regexFails(g, run, last);
		}
		if (g.type === "tool_order") {
			return orderFails(g, calls);
		}
		return usedFails(g, calls);
	};
	return graders.filter(fails).map((g) => g.name);
};

/** The tool calls of a run. */
export const toolCalls = (run: Transcript): number =>
	run.events.flatMap((e) =>
		(e.message?.content ?? []).filter((b) => b.type === "tool_use"),
	).length;

/** The input and output tokens of a run, from the `usage` of its `result` event, or `undefined` when it has none. */
export const runTokens = (run: Transcript): number | undefined => {
	const u = run.events.findLast((e) => e.type === "result")?.usage;
	return u === undefined
		? undefined
		: (u.input_tokens ?? 0) + (u.output_tokens ?? 0);
};
