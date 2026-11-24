// REQ-YOU-SHOULD-KNOW-061 timing probe: a scripted fake API. The main loop answers each request with a Glob
// call 2.5 s later; the you-should-know fork (its prompt holds "quiet observer") gets a fixed note.
// Logs each request with a timestamp. Usage: bun ysk-timing.ts <port>, then claude in tmux with
// ANTHROPIC_BASE_URL on that port, --plugin-dir plugins/claudetto-you-should-know and
// CLAUDE_CODE_YOU_SHOULD_KNOW_DEBUG=1.
import { streamedReply } from "../../../tools/measure-tools/fake-api";
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
		const body = (await req.json()) as any;
		const text = JSON.stringify(body.messages ?? []);
		let reply: any;
		if (text.includes("quiet observer beside a long coding session")) {
			log("fork request");
			reply = {
				text: "learn: PROBE-YSK the probe note shows before the remaining steps.\ntag: Heads up\nexplain:\n**Probe note title**\nThe probe body."
			};
		} else if (!body.tools?.length) {
			log("toolless request");
			reply = { text: "ok" };
		} else {
			const n = (text.match(/"tool_result"/g) ?? []).length;
			if (n < 6) {
				await Bun.sleep(2500);
				log(`main step ${n + 1}`);
				reply = { tool: "Glob", input: { pattern: `*.probe${n}` } };
			} else {
				log("main end");
				reply = { text: "All six steps done." };
			}
		}
		return new Response(streamedReply(reply), {
			headers: { "content-type": "text/event-stream" }
		});
	}
});
log(`listening ${server.port}`);
