import { isRecord } from "../shared/record.ts";

const ABBREVIATIONS = ["e.g.", "i.e.", "etc.", "vs.", "cf.", "approx.", "no."];
const CODE_SPAN = /`[^`\n]*`/g;
const PLACEHOLDER = /\u0000(\d+)\u0000/g;
const LEAD_MARK = /^\s*(#{1,6}\s+|[-*+]\s+|\d+[.)]\s+|>\s*)+/;
const SENTENCE_END = /[.!?]["')\]]*(?=\s|$)/g;

export interface Segment {
	turn: number;
	messageId: string;
	text: string;
}

export interface ToolCall {
	turn: number;
	id: string;
	name: string;
	input: unknown;
}

export interface ToolResult {
	toolUseId: string;
	content: unknown;
	isError: boolean;
}

export interface Reply {
	complete: boolean;
	reason?: string;
	segments: Segment[];
	toolCalls: ToolCall[];
	toolResults: ToolResult[];
	turns: number;
	// The `.result` field of a lone result object: the last text block only, kept for diagnosis and never graded.
	tail?: string;
}

export const readStreamJson = (text: string): Reply =>
	fromFrames(
		text
			.split("\n")
			.filter((l) => l.trim().startsWith("{"))
			.map((l) => JSON.parse(l)),
	);

export const readJsonOutput = (text: string): Reply => {
	const parsed: unknown = JSON.parse(text);
	if (Array.isArray(parsed)) {
		return fromFrames(parsed);
	}
	const tail = isRecord(parsed) && typeof parsed.result === "string" ? parsed.result : "";
	return {
		...empty(),
		complete: false,
		reason: "json without --verbose: .result holds only the last text block",
		tail,
	};
};

// Transcript JSONL: user and assistant entries; sidechain entries belong to a subagent.
export const readTranscript = (text: string): Reply => {
	const entries: unknown[] = text
		.split("\n")
		.filter((l) => l.trim().startsWith("{"))
		.map((l) => JSON.parse(l));
	const frames = entries
		.filter((e) => isRecord(e) && (e.type === "assistant" || e.type === "user"))
		.map((e) => (isRecord(e) && e.isSidechain ? { ...e, parent_tool_use_id: "sidechain" } : e));
	const reply = fromFrames(frames);
	const done = reply.segments.length > 0;
	return done ? { ...reply, complete: true } : { ...reply, complete: false, reason: "no assistant text" };
};

export const replyText = (reply: Reply): string => reply.segments.map((s) => s.text).join("\n\n");

export const sentences = (text: string): string[] => {
	const spans: string[] = [];
	const hidden = text.replace(CODE_SPAN, (m) => {
		spans.push(m);
		return `\u0000${spans.length - 1}\u0000`;
	});
	return hidden
		.split("\n")
		.map((line) => line.replace(LEAD_MARK, "").trim())
		.filter((line) => line !== "")
		.flatMap(splitLine)
		.map((s) => s.replace(PLACEHOLDER, (_, i: string) => spans[Number(i)] ?? ""));
};

export const firstSentence = (reply: Reply): string => sentences(replyText(reply))[0] ?? "";

const empty = (): Reply => ({ complete: false, segments: [], toolCalls: [], toolResults: [], turns: 0 });

const splitLine = (line: string): string[] => {
	const out: string[] = [];
	let start = 0;
	for (const m of line.matchAll(SENTENCE_END)) {
		const end = m.index + m[0].length;
		if (endsWithAbbreviation(line.slice(start, end))) {
			continue;
		}
		out.push(line.slice(start, end).trim());
		start = end;
	}
	const rest = line.slice(start).trim();
	return rest ? [...out, rest] : out;
};

const endsWithAbbreviation = (piece: string): boolean => {
	const lower = piece.toLowerCase();
	return ABBREVIATIONS.some((a) => lower.endsWith(` ${a}`) || lower === a);
};

const fromFrames = (frames: unknown[]): Reply => {
	const reply = empty();
	let lastId = "";
	let result: Record<string, unknown> | undefined;
	for (const f of frames) {
		if (!isRecord(f)) {
			continue;
		}
		if (f.type === "result") {
			result = f;
		} else if (f.type === "assistant" && !f.parent_tool_use_id && isRecord(f.message)) {
			const id = String(f.message.id ?? "");
			if (id !== lastId) {
				reply.turns++;
				lastId = id;
			}
			addAssistant(reply, id, f.message.content);
		} else if (f.type === "user" && !f.parent_tool_use_id && isRecord(f.message)) {
			addResults(reply, f.message.content);
		}
	}
	return finish(reply, result);
};

const finish = (reply: Reply, result: Record<string, unknown> | undefined): Reply => {
	if (!result) {
		return { ...reply, complete: false, reason: "no result frame" };
	}
	if (result.subtype !== "success" || result.is_error === true) {
		return { ...reply, complete: false, reason: `result ${String(result.subtype)}` };
	}
	return { ...reply, complete: true };
};

const addAssistant = (reply: Reply, messageId: string, content: unknown): void => {
	for (const block of Array.isArray(content) ? content : []) {
		if (!isRecord(block)) {
			continue;
		}
		if (block.type === "text" && typeof block.text === "string") {
			reply.segments.push({ turn: reply.turns, messageId, text: block.text });
		} else if (block.type === "tool_use") {
			reply.toolCalls.push({ turn: reply.turns, id: String(block.id), name: String(block.name), input: block.input });
		}
	}
};

const addResults = (reply: Reply, content: unknown): void => {
	for (const block of Array.isArray(content) ? content : []) {
		if (isRecord(block) && block.type === "tool_result") {
			reply.toolResults.push({
				toolUseId: String(block.tool_use_id),
				content: block.content,
				isError: block.is_error === true,
			});
		}
	}
};
