// A probe pays only for the requests it picks: every other Messages request gets a local answer.

import { serve } from "bun";
import { answerHeaders, sendOn, type Usage, usageIn } from "./forward.ts";
import { fieldOf } from "./json.ts";

/** One request that went upstream, with what came back; the bearer is never kept. */
export interface Forwarded {
	readonly model: string;
	readonly maxTokens: number | undefined;
	readonly bodyChars: number;
	/** `0` when the upstream could not be reached. */
	readonly status: number;
	readonly reply: string;
	readonly usage: Usage | undefined;
}

/** What a probe gives the split API: which bodies go upstream, and the answer to every other one. */
export interface SplitOptions {
	readonly upstream: string;
	readonly picks: (body: unknown) => boolean;
	readonly answer: (body: unknown) => Response;
}

/** A running split API; `forwarded` grows as picked requests come back. */
export interface SplitApi {
	readonly url: string;
	readonly forwarded: readonly Forwarded[];
	/** The number of requests answered locally. */
	readonly local: () => number;
	readonly stop: () => Promise<void>;
}

const forward = async (
	request: Request,
	raw: string,
	body: unknown,
	upstream: string,
): Promise<{ response: Response; row: Forwarded }> => {
	const model = String(fieldOf(body, "model") ?? "");
	const max = fieldOf(body, "max_tokens");
	const base = {
		model,
		maxTokens: typeof max === "number" ? max : undefined,
		bodyChars: raw.length,
	};
	try {
		const sent = await sendOn(request, raw, upstream);
		const reply = await sent.text();
		return {
			response: new Response(reply, {
				status: sent.status,
				headers: answerHeaders(sent),
			}),
			row: { ...base, status: sent.status, reply, usage: usageIn(reply) },
		};
	} catch (error) {
		const reply = String(error).slice(0, 200);
		return {
			response: new Response("the split API could not reach the upstream", {
				status: 502,
			}),
			row: { ...base, status: 0, reply, usage: undefined },
		};
	}
};

/** Requests to any route but `/messages` get an empty JSON object, as the capture fake gives them. */
export const startSplitApi = (options: SplitOptions): SplitApi => {
	const forwarded: Forwarded[] = [];
	let local = 0;
	const server = serve({
		hostname: "127.0.0.1",
		port: 0,
		idleTimeout: 0,
		fetch: async (request) => {
			const { pathname } = new URL(request.url);
			if (!(pathname.endsWith("/messages") && request.method === "POST")) {
				return Response.json({});
			}
			const raw = await request.text();
			const body: unknown = JSON.parse(raw);
			if (!options.picks(body)) {
				local += 1;
				return options.answer(body);
			}
			const { response, row } = await forward(
				request,
				raw,
				body,
				options.upstream,
			);
			forwarded.push(row);
			return response;
		},
	});
	return {
		url: `http://127.0.0.1:${server.port}`,
		forwarded,
		local: () => local,
		stop: () => server.stop(true),
	};
};
