// REQ-SETUP-004 probe: a scripted fake API for a bare `/statusline` typed in a TUI. When the prompt asks
// for the `statusline-setup` agent it answers with that Agent call, as the stock text directs; every
// other request gets "ok". Logs each request: tools count, body bytes, and the last user text head.
// Usage: bun statusline.ts <port>, then claude in tmux with ANTHROPIC_BASE_URL on that port.
import { streamedReply } from "../../../../tools/measure-tools/fake-api";
const log = (s: string) => console.log(`${new Date().toISOString()} ${s}`);
const server = Bun.serve({
	port: Number(process.argv[2] ?? 0),
	hostname: "127.0.0.1",
	async fetch(req) {
		const path = new URL(req.url).pathname;
		if (req.method !== "POST" || !path.startsWith("/v1/messages"))
			return new Response("{}", {
				headers: { "content-type": "application/json" }
			});
		const raw = await req.text();
		const body = JSON.parse(raw) as any;
		const text = JSON.stringify(body.messages ?? []);
		const last = body.messages?.at(-1);
		const head = JSON.stringify(last?.content ?? "").slice(0, 160);
		log(
			`request tools=${body.tools?.length ?? 0} bytes=${raw.length} last=${head}`
		);
		const asks = text.includes('subagent_type \\"statusline-setup\\"');
		const done = text.includes('"tool_result"');
		const reply =
			asks && !done
				? {
						tool: "Agent",
						input: {
							subagent_type: "statusline-setup",
							description: "Set status line",
							prompt: "Set the status line to show the model."
						}
					}
				: { text: "ok" };
		return new Response(streamedReply(reply), {
			headers: { "content-type": "text/event-stream" }
		});
	}
});
log(`listening ${server.port}`);
