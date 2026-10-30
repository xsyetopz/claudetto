import { serve } from "bun";
import {
	ANSWER,
	JSON_ANSWER,
	jsonResponse,
	streamResponse,
	type ToolCall,
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

/** With `call`, the first request that carries tools is answered with that tool call, once. */
export const startFakeApi = (call?: ToolCall): FakeApi => {
	const bodies: string[] = [];
	const others: string[] = [];
	let pending = call;
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
					return jsonResponse(JSON_ANSWER);
				}
				if (pending !== undefined && carriesTools(body)) {
					const answer = toolAnswer(pending);
					pending = undefined;
					return streamResponse(answer);
				}
				return streamResponse(ANSWER);
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
