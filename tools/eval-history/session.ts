import { createHash } from "node:crypto";

// The transcript fields below follow the 2.1.330 writer (clawdipedia reference/transcript-format).
const VERSION = "2.1.330";
const MODEL = "claude-opus-5-5";
const START_MS = Date.UTC(2026, 10, 20, 9, 0, 0);
const CHARS_PER_TOKEN = 3.6;

const hex = (seed: string, length: number): string =>
	createHash("sha256").update(seed).digest("hex").slice(0, length);

const uuidOf = (seed: string): string => {
	const h = hex(seed, 32);
	return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
};

/** One tool the assistant called, kept for pairing with its result. */
export interface ToolCall {
	readonly id: string;
	readonly assistantUuid: string;
}

/** Builds a Claude Code transcript JSONL line by line, chained through `parentUuid`. */
export class Session {
	readonly lines: string[] = [];
	readonly sessionId: string;
	readonly cwd: string;
	#parent: string | null = null;
	#counter = 0;
	#clock = START_MS;
	#contextTokens = 6000;

	constructor(sessionId: string, cwd: string) {
		this.sessionId = sessionId;
		this.cwd = cwd;
	}

	/** Rough token estimate of the transcript so far, as the assistant usage fields report it. */
	get contextTokens(): number {
		return this.#contextTokens;
	}

	#next(kind: string): { uuid: string; timestamp: string } {
		this.#counter += 1;
		this.#clock += 4000 + ((this.#counter * 7919) % 41_000);
		return {
			uuid: uuidOf(`${this.sessionId}:${kind}:${this.#counter}`),
			timestamp: new Date(this.#clock).toISOString()
		};
	}

	#push(entry: Record<string, unknown>, uuid: string): void {
		this.lines.push(
			JSON.stringify({
				parentUuid: this.#parent,
				isSidechain: false,
				userType: "external",
				entrypoint: "sdk-cli",
				cwd: this.cwd,
				sessionId: this.sessionId,
				version: VERSION,
				gitBranch: "main",
				...entry,
				uuid
			})
		);
		this.#parent = uuid;
	}

	/** A prompt the person typed. */
	user(text: string): void {
		const { uuid, timestamp } = this.#next("user");
		this.#contextTokens += Math.ceil(text.length / CHARS_PER_TOKEN);
		this.#push(
			{
				type: "user",
				message: { role: "user", content: text },
				promptId: uuidOf(`${this.sessionId}:prompt:${this.#counter}`),
				permissionMode: "default",
				timestamp
			},
			uuid
		);
	}

	#assistant(
		content: Record<string, unknown>,
		stop: string,
		ids: { message: string; request: string }
	): string {
		const { uuid, timestamp } = this.#next("assistant");
		const out = Math.ceil(JSON.stringify(content).length / CHARS_PER_TOKEN);
		this.#push(
			{
				type: "assistant",
				message: {
					id: ids.message,
					type: "message",
					role: "assistant",
					model: MODEL,
					content: [content],
					stop_reason: stop,
					stop_sequence: null,
					usage: {
						input_tokens: 3,
						cache_creation_input_tokens: 0,
						cache_read_input_tokens: this.#contextTokens,
						output_tokens: out
					}
				},
				requestId: ids.request,
				timestamp
			},
			uuid
		);
		this.#contextTokens += out;
		return uuid;
	}

	#ids(): { message: string; request: string } {
		return {
			message: `msg_${hex(`m${this.#counter}${this.sessionId}`, 24)}`,
			request: `req_${hex(`r${this.#counter}${this.sessionId}`, 24)}`
		};
	}

	/** An assistant message that calls one tool. */
	toolCall(name: string, input: Record<string, unknown>): ToolCall {
		const id = `toolu_${hex(`t${this.#counter}${this.sessionId}`, 22)}`;
		const assistantUuid = this.#assistant(
			{ type: "tool_use", id, name, input },
			"tool_use",
			this.#ids()
		);
		return { id, assistantUuid };
	}

	/** The result the harness returns for a call. */
	toolResult(call: ToolCall, content: string): void {
		const { uuid, timestamp } = this.#next("result");
		this.#contextTokens += Math.ceil(content.length / CHARS_PER_TOKEN);
		this.#push(
			{
				type: "user",
				message: {
					role: "user",
					content: [{ type: "tool_result", tool_use_id: call.id, content }]
				},
				sourceToolAssistantUUID: call.assistantUuid,
				permissionMode: "default",
				timestamp
			},
			uuid
		);
	}

	/** The assistant's closing text for a turn. */
	reply(text: string): void {
		this.#assistant({ type: "text", text }, "end_turn", this.#ids());
	}

	/** The transcript, one JSON object per line. */
	toJsonl(): string {
		return `${this.lines.join("\n")}\n`;
	}
}
