// Fake Messages API for issue #62. Logs every request; answers by mode.
// Usage: bun stub.ts <port> <log> <mode> [model]
//   overload: 529 for requests on <model>, OK for any other model.
//   server:   500 for requests on <model>.
//   compact:  529 for a compaction request (its last message holds the summary prompt) on <model>.
//   ok:       OK for every request.
import { appendFileSync } from "node:fs";
const [port, log, mode, bad] = process.argv.slice(2);
const sse = (e: string, d: unknown) =>
	`event: ${e}\ndata: ${JSON.stringify(d)}\n\n`;
const reply = (model: string, text: string) => {
	const m = {
		id: "msg_s",
		type: "message",
		role: "assistant",
		content: [],
		stop_reason: null,
		stop_sequence: null,
		usage: { input_tokens: 10, output_tokens: 5 },
		model
	};
	return (
		sse("message_start", { type: "message_start", message: m }) +
		sse("content_block_start", {
			type: "content_block_start",
			index: 0,
			content_block: { type: "text", text: "" }
		}) +
		sse("content_block_delta", {
			type: "content_block_delta",
			index: 0,
			delta: { type: "text_delta", text }
		}) +
		sse("content_block_stop", { type: "content_block_stop", index: 0 }) +
		sse("message_delta", {
			type: "message_delta",
			delta: { stop_reason: "end_turn", stop_sequence: null },
			usage: { output_tokens: 5 }
		}) +
		sse("message_stop", { type: "message_stop" })
	);
};
const err = (status: number, type: string) =>
	Response.json(
		{ type: "error", error: { type, message: `stub ${type}` } },
		{ status }
	);
Bun.serve({
	port: Number(port),
	async fetch(req) {
		const u = new URL(req.url);
		const t = await req.text();
		let b: {
			model?: string;
			stream?: boolean;
			system?: unknown;
			messages?: unknown;
		} = {};
		try {
			b = JSON.parse(t);
		} catch {}
		const compacting = JSON.stringify(b.messages ?? "").includes(
			"Your task is to create a detailed summary of the conversation"
		);
		appendFileSync(
			log,
			`${JSON.stringify({ t: Date.now(), path: u.pathname, model: b.model, compacting, bytes: t.length, effort: (b as Record<string, unknown>)["output_config"] ?? null, thinking: (b as Record<string, unknown>)["thinking"] ?? null, systemBytes: JSON.stringify(b.system ?? "").length })}\n`
		);
		if (u.pathname.startsWith("/v1/messages/count_tokens"))
			return Response.json({ input_tokens: 10 });
		if (!u.pathname.startsWith("/v1/messages")) return Response.json({});
		const onBad = b.model === bad;
		if (mode === "overload" && onBad) return err(529, "overloaded_error");
		if (mode === "server" && onBad) return err(500, "api_error");
		if (mode === "compact" && onBad && compacting)
			return err(529, "overloaded_error");
		const text = compacting ? "<summary>stub summary</summary>" : "OK";
		if (b.stream === false)
			return Response.json({
				id: "msg_s",
				type: "message",
				role: "assistant",
				model: b.model,
				content: [{ type: "text", text }],
				stop_reason: "end_turn",
				usage: { input_tokens: 10, output_tokens: 5 }
			});
		return new Response(reply(b.model ?? "x", text), {
			headers: { "content-type": "text/event-stream" }
		});
	}
});
