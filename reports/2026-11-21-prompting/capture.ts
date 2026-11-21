/**
 * Fake Anthropic API that records each `/v1/messages` request body.
 * Usage: `bun capture.ts <out-prefix> <port>`; each request lands in `<out-prefix>-<n>.json`.
 */
const [out, port] = process.argv.slice(2);
if (out === undefined || port === undefined) {
	throw new Error("usage: bun capture.ts <out-prefix> <port>");
}

const event = (name: string, data: unknown): string =>
	`event: ${name}\ndata: ${JSON.stringify(data)}\n\n`;

let count = 0;
Bun.serve({
	port: Number(port),
	async fetch(req) {
		const url = new URL(req.url);
		if (!(url.pathname.startsWith("/v1/messages") && req.method === "POST")) {
			return Response.json({});
		}
		const body = (await req.json()) as { model: string; stream?: boolean };
		await Bun.write(`${out}-${count++}.json`, JSON.stringify(body));
		const message = {
			id: "msg_1",
			type: "message",
			role: "assistant",
			model: body.model,
			content: [{ type: "text", text: "hi" }],
			stop_reason: "end_turn",
			stop_sequence: null,
			usage: { input_tokens: 1, output_tokens: 1 }
		};
		if (!body.stream) {
			return Response.json(message);
		}
		const stream =
			event("message_start", {
				type: "message_start",
				message: { ...message, content: [] }
			}) +
			event("content_block_start", {
				type: "content_block_start",
				index: 0,
				content_block: { type: "text", text: "" }
			}) +
			event("content_block_delta", {
				type: "content_block_delta",
				index: 0,
				delta: { type: "text_delta", text: "hi" }
			}) +
			event("content_block_stop", { type: "content_block_stop", index: 0 }) +
			event("message_delta", {
				type: "message_delta",
				delta: { stop_reason: "end_turn", stop_sequence: null },
				usage: { output_tokens: 1 }
			}) +
			event("message_stop", { type: "message_stop" });
		return new Response(stream, {
			headers: { "content-type": "text/event-stream" }
		});
	}
});
