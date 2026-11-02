import { serve } from "bun";
import {
	FAKE,
	jsonResponse,
	type Stamp,
	streamResponse,
	type ToolCall,
	textMessage,
	textStream,
	toolAnswer,
} from "./answer.ts";
import { carriesTools, streams } from "./match.ts";

/** A running fake Messages API and what it has seen. */
export interface FakeApi {
	readonly url: string;
	readonly bodies: string[];
	/** The requests to any other route, which a reading must not depend on. */
	readonly others: string[];
	stop: () => Promise<void>;
}

/** With `call`, the first request that carries tools is answered with that tool call, once, and with a list each such request takes the next; every other request gets `text`. Each answer carries `stamp`'s model and token counts. `onBody` gets each messages body as it arrives. */
export const startFakeApi = (
	call?: ToolCall | readonly ToolCall[],
	text = "ok",
	stamp: Stamp = FAKE,
	onBody: (raw: string) => void = () => undefined,
): FakeApi => {
	const bodies: string[] = [];
	const others: string[] = [];
	const pending = call === undefined ? [] : [call].flat();
	let made = 0;
	let answered = 0;
	// The CLI joins answers that share a message id into one assistant message.
	const nextStamp = (): Stamp => {
		const id = answered === 0 ? stamp.id : `${stamp.id}_${answered}`;
		answered += 1;
		return { ...stamp, id };
	};
	const server = serve({
		hostname: "127.0.0.1",
		port: 0,
		fetch: async (request) => {
			const { pathname } = new URL(request.url);
			if (pathname.endsWith("/messages") && request.method === "POST") {
				const raw = await request.text();
				bodies.push(raw);
				onBody(raw);
				const body: unknown = JSON.parse(raw);
				if (!streams(body)) {
					return jsonResponse(textMessage(text, nextStamp()));
				}
				const next = pending[made];
				if (next !== undefined && carriesTools(body)) {
					// Two calls in one conversation must not share an id, and the CLI drops the result of an id that ends in `_1`.
					const id = made === 0 ? undefined : `toolu_fake${made}`;
					made += 1;
					return streamResponse(toolAnswer(next, id, nextStamp()));
				}
				return streamResponse(textStream(text, nextStamp()));
			}
			others.push(`${request.method} ${pathname}`);
			return jsonResponse("{}");
		},
	});
	return {
		url: `http://127.0.0.1:${server.port}`,
		bodies,
		others,
		stop: () => server.stop(true),
	};
};
