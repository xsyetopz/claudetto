// Reads a stream-json transcript into the tool calls of each assistant message.

export interface Call {
	readonly name: string;
	readonly input: Record<string, unknown>;
}

export interface Turn {
	readonly id: string;
	readonly calls: readonly Call[];
}

export const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null;

const parseLine = (line: string): Record<string, unknown> | undefined => {
	try {
		const event: unknown = JSON.parse(line);
		return isRecord(event) ? event : undefined;
	} catch {
		return undefined;
	}
};

const callOf = (block: unknown): Call | undefined => {
	if (!isRecord(block) || block["type"] !== "tool_use") {
		return undefined;
	}
	const name = block["name"];
	const input = block["input"];
	return typeof name === "string"
		? { name, input: isRecord(input) ? input : {} }
		: undefined;
};

/** The stream splits one model message into an event per content block, all carrying the message `id`, so a turn joins the events that share it. */
export const turnsOf = (transcript: string): readonly Turn[] => {
	const turns: { id: string; calls: Call[] }[] = [];
	for (const [at, line] of transcript.split("\n").entries()) {
		const event = parseLine(line);
		const message = event?.["message"];
		if (event?.["type"] !== "assistant" || !isRecord(message)) {
			continue;
		}
		const content = message["content"];
		const calls = Array.isArray(content)
			? content.flatMap((b) => callOf(b) ?? [])
			: [];
		const rawId = message["id"];
		const id = typeof rawId === "string" ? rawId : `line-${at}`;
		const last = turns.at(-1);
		if (last?.id === id) {
			last.calls.push(...calls);
		} else {
			turns.push({ id, calls: [...calls] });
		}
	}
	return turns;
};

export const callsOf = (transcript: string): readonly Call[] =>
	turnsOf(transcript).flatMap((turn) => turn.calls);

/** The text of the closing `result` event, which is the session's final reply. */
export const resultOf = (transcript: string): string => {
	for (const line of transcript.split("\n").toReversed()) {
		const event = parseLine(line);
		if (event?.["type"] === "result") {
			const text = event["result"];
			return typeof text === "string" ? text : "";
		}
	}
	return "";
};

export const stringInput = (call: Call, key: string): string => {
	const value = call.input[key];
	return typeof value === "string" ? value : "";
};
