// Splits one transcript into the main-thread API calls between compactions, with what each call added to the context.

import {
	type Call,
	callOf,
	type Entry,
	inWindow,
	isRecord,
	stringOf,
	type Window,
} from "../transcripts.ts";

export const ASSISTANT_OUTPUT = "assistant output";

export interface Step {
	readonly prompt: number;
	readonly output: number;
	// Characters added to the context since the previous step, by source.
	readonly added: ReadonlyMap<string, number>;
	thinking: boolean;
	tools: number;
}

export interface Segments {
	readonly segments: Step[][];
	readonly results: Map<string, number[]>;
}

const bump = (map: Map<string, number>, key: string, by: number): void => {
	map.set(key, (map.get(key) ?? 0) + by);
};

const sizeOf = (content: unknown): number => {
	if (typeof content === "string") {
		return content.length;
	}
	if (!Array.isArray(content)) {
		return 0;
	}
	let size = 0;
	for (const block of content) {
		const text = isRecord(block) ? stringOf(block["text"]) : undefined;
		size += text?.length ?? JSON.stringify(block).length;
	}
	return size;
};

// One server per plugin is one source, whatever the tool.
const toolLabel = (name: string): string =>
	name.startsWith("mcp__") ? name.split("__").slice(0, 2).join("__") : name;

const blocksOf = (message: Entry): Entry[] =>
	Array.isArray(message["content"]) ? message["content"].filter(isRecord) : [];

interface State {
	pending: Map<string, number>;
	readonly names: Map<string, string>;
	readonly steps: Map<string, Step>;
	readonly out: Segments;
}

const takeAssistant = (state: State, call: Call, message: Entry): void => {
	let step = state.steps.get(call.key);
	if (step === undefined) {
		step = {
			prompt: call.prompt,
			output: call.output,
			added: state.pending,
			thinking: false,
			tools: 0,
		};
		state.pending = new Map();
		state.steps.set(call.key, step);
		state.out.segments.at(-1)?.push(step);
	}
	for (const block of blocksOf(message)) {
		const type = block["type"];
		if (type === "thinking" || type === "redacted_thinking") {
			step.thinking = true;
		} else if (type === "tool_use") {
			step.tools += 1;
			state.names.set(
				stringOf(block["id"]) ?? "",
				toolLabel(stringOf(block["name"]) ?? "?"),
			);
		}
	}
};

const takeUser = (state: State, entry: Entry, message: Entry): void => {
	const source = entry["isMeta"] === true ? "meta/reminders" : "user text";
	const content = message["content"];
	if (typeof content === "string") {
		bump(state.pending, source, content.length);
		return;
	}
	for (const block of blocksOf(message)) {
		switch (block["type"]) {
			case "tool_result": {
				const name =
					state.names.get(stringOf(block["tool_use_id"]) ?? "") ?? "?";
				const size = sizeOf(block["content"]);
				bump(state.pending, `tool ${name}`, size);
				const sizes = state.out.results.get(name) ?? [];
				sizes.push(size);
				state.out.results.set(name, sizes);
				break;
			}
			case "text":
				bump(state.pending, source, stringOf(block["text"])?.length ?? 0);
				break;
			default:
		}
	}
};

const takeAttachment = (state: State, entry: Entry): void => {
	const attachment = entry["attachment"];
	const type = isRecord(attachment)
		? (stringOf(attachment["type"]) ?? "?")
		: "?";
	// A snapshot of the system prompt and the bookkeeping records are not sent.
	if (type !== "prompt_snapshot" && !type.endsWith("_record")) {
		bump(state.pending, `att ${type}`, JSON.stringify(attachment ?? {}).length);
	}
};

const takeEntry = (state: State, entry: Entry, window: Window): void => {
	const message = entry["message"];
	switch (entry["type"]) {
		case "assistant": {
			const call = callOf(entry);
			if (isRecord(message) && call !== undefined && inWindow(call, window)) {
				takeAssistant(state, call, message);
			}
			break;
		}
		case "user":
			if (isRecord(message)) {
				takeUser(state, entry, message);
			}
			break;
		case "attachment":
			takeAttachment(state, entry);
			break;
		default:
	}
};

export const segmentsOf = (
	entries: readonly Entry[],
	window: Window,
): Segments => {
	const state: State = {
		pending: new Map(),
		names: new Map(),
		steps: new Map(),
		out: { segments: [[]], results: new Map() },
	};
	for (const entry of entries) {
		if (entry["isSidechain"] === true || entry["isCompactSummary"] === true) {
			continue;
		}
		if (entry["subtype"] === "compact_boundary") {
			state.out.segments.push([]);
			state.pending = new Map();
		} else {
			takeEntry(state, entry, window);
		}
	}
	return state.out;
};
