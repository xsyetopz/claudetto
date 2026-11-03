// A fake Messages API whose first marked request gets many tool calls in one answer, the load under which a hooks worker has crashed.

import { serve, sleep } from "bun";
import {
	FAKE,
	jsonResponse,
	streamResponse,
	textMessage,
	textStream,
} from "./answer.ts";
import { fieldOf } from "./json.ts";
import { carriesTools, streams } from "./match.ts";
import { sse } from "./sse.ts";

/** A main-thread prompt that holds this word gets the parallel answer. */
export const PARALLEL = "PARALLEL";

/** Each subagent prompt starts with this word, so the API can tell its requests from the main thread's. */
export const SUBTASK = "SUBTASK";

const AGENT_TYPES = [
	"claudetto:Artemis",
	"claudetto:Hephaestus",
	"claudetto:Athena",
	"claudetto:Hermes",
];

export interface ParallelOptions {
	/** How many `Agent` calls the parallel answer holds. */
	readonly agents: number;
	/** How many tool calls each subagent makes before it ends its turn. */
	readonly rounds: number;
	/** The folder the session works in, which the `Write` and `Read` calls name. */
	readonly work: string;
	/** A wait before each answer to a request without tools, such as a classifier or a title. */
	readonly delayMs?: number;
}

export interface ParallelApi {
	readonly url: string;
	stop: () => Promise<void>;
}

interface Block {
	readonly name: string;
	readonly input: Record<string, unknown>;
}

const callsAnswer = (blocks: readonly Block[], id: number): string =>
	[
		sse("message_start", {
			type: "message_start",
			message: {
				id: `msg_parallel${id}`,
				type: "message",
				role: "assistant",
				model: FAKE.model,
				content: [],
				stop_reason: null,
				stop_sequence: null,
				usage: FAKE.usage,
			},
		}),
		...blocks.flatMap((block, index) => [
			sse("content_block_start", {
				type: "content_block_start",
				index,
				content_block: {
					type: "tool_use",
					id: `toolu_parallel${id}x${index}`,
					name: block.name,
					input: {},
				},
			}),
			sse("content_block_delta", {
				type: "content_block_delta",
				index,
				delta: {
					type: "input_json_delta",
					partial_json: JSON.stringify(block.input),
				},
			}),
			sse("content_block_stop", { type: "content_block_stop", index }),
		]),
		sse("message_delta", {
			type: "message_delta",
			delta: { stop_reason: "tool_use", stop_sequence: null },
			usage: { output_tokens: 1 },
		}),
		sse("message_stop", { type: "message_stop" }),
	].join("");

const parallelBlocks = (options: ParallelOptions): Block[] => [
	...Array.from({ length: options.agents }, (_, at) => ({
		name: "Agent",
		input: {
			description: `probe ${at}`,
			prompt: `${SUBTASK} ${at}: look around`,
			subagent_type: AGENT_TYPES[at % AGENT_TYPES.length],
			run_in_background: true,
		},
	})),
	...[0, 1, 2].map((at) => ({
		name: "Write",
		input: { file_path: `${options.work}/w${at}.md`, content: `w${at}\n` },
	})),
	{ name: "Bash", input: { command: "git status", description: "status" } },
];

const roundBlocks = (round: number, work: string): Block[] => [
	{
		name: "Bash",
		input: { command: `git status && echo ${round}`, description: "look" },
	},
	{ name: "Read", input: { file_path: `${work}/README.md` } },
	{
		name: "Bash",
		input: { command: "git log --oneline -5", description: "log" },
	},
];

/** A subagent takes its rounds in turn, one call each; the main thread gets the parallel calls once. */
const toolsAnswer = (
	messages: string,
	options: ParallelOptions,
	state: { answered: number; parallelSent: boolean },
): string => {
	if (messages.includes(SUBTASK)) {
		const round = (messages.match(/tool_result/g) ?? []).length;
		const block = roundBlocks(round, options.work)[round % 3];
		return round >= options.rounds || block === undefined
			? textStream("done")
			: callsAnswer([block], state.answered);
	}
	if (messages.includes(PARALLEL) && !state.parallelSent) {
		state.parallelSent = true;
		return callsAnswer(parallelBlocks(options), state.answered);
	}
	return textStream("ok");
};

/** Answers the first request whose messages hold `PARALLEL` with all its calls at once, a `SUBTASK` with `rounds` calls one by one, and every other request with plain text. */
export const startParallelApi = (options: ParallelOptions): ParallelApi => {
	const state = { answered: 0, parallelSent: false };
	const server = serve({
		hostname: "127.0.0.1",
		port: 0,
		fetch: async (request) => {
			const { pathname } = new URL(request.url);
			if (!(pathname.endsWith("/messages") && request.method === "POST")) {
				return jsonResponse("{}");
			}
			const body: unknown = await request.json();
			state.answered += 1;
			if (!(streams(body) && carriesTools(body))) {
				await sleep(options.delayMs ?? 0);
				return streams(body)
					? streamResponse(textStream("<block>no</block>"))
					: jsonResponse(textMessage("<block>no</block>"));
			}
			const messages = JSON.stringify(fieldOf(body, "messages") ?? []);
			return streamResponse(toolsAnswer(messages, options, state));
		},
	});
	return {
		url: `http://127.0.0.1:${server.port}`,
		stop: () => server.stop(true),
	};
};
