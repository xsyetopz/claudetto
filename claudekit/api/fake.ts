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

/** With `call`, the first request that carries tools is answered with that tool call, once, and with a list each such request takes the next; every other request gets `text`. Each answer carries `stamp`'s model and token counts. */
export const startFakeApi = (
	call?: ToolCall | readonly ToolCall[],
	text = "ok",
	stamp: Stamp = FAKE,
): FakeApi => {
	const bodies: string[] = [];
	const others: string[] = [];
	const pending = call === undefined ? [] : [call].flat();
	let made = 0;
	const server = serve({
		hostname: "127.0.0.1",
		port: 0,
		fetch: async (request) => {
			const { pathname } = new URL(request.url);
			if (pathname.endsWith("/messages") && request.method === "POST") {
				const raw = await request.text();
				bodies.push(raw);
				const body: unknown = JSON.parse(raw);
				if (!streams(body)) {
					return jsonResponse(textMessage(text, stamp));
				}
				const next = pending[made];
				if (next !== undefined && carriesTools(body)) {
					// Two calls in one conversation must not share an id.
					const id = made === 0 ? undefined : `toolu_fake_${made}`;
					made += 1;
					return streamResponse(toolAnswer(next, id, stamp));
				}
				return streamResponse(textStream(text, stamp));
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
