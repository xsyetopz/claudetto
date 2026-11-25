// Prints, for each request of one turn, the effort, thinking and cache markers it carried.
// The fake API answers the first request with a Bash call and the rest with text.
// Usage: bun probe.ts [plugin-dir]
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { streamedReply } from "../../../tools/measure-tools/fake-api";

const [pluginDir] = Bun.argv.slice(2);
const seen: Record<string, unknown>[] = [];
let n = 0;
const server = Bun.serve({
	port: 0,
	hostname: "127.0.0.1",
	async fetch(req) {
		if (
			req.method !== "POST" ||
			!new URL(req.url).pathname.startsWith("/v1/messages")
		) {
			return Response.json({});
		}
		const body = (await req.json()) as Record<string, unknown>;
		const main =
			Array.isArray(body["tools"]) && (body["tools"] as unknown[]).length > 0;
		if (main) seen.push(body);
		const reply =
			main && n++ === 0 ? { tool: "Bash", input: {} } : { text: "ok" };
		return new Response(streamedReply(reply), {
			headers: { "content-type": "text/event-stream" }
		});
	}
});
const config = await mkdtemp(join(tmpdir(), "cfg-"));
const cwd = await mkdtemp(join(tmpdir(), "work-"));
const proc = Bun.spawn(
	[
		"claude",
		"-p",
		"Run a command.",
		"--no-session-persistence",
		"--model",
		"claude-haiku-5-5",
		...(process.env["PROBE_FLAG"]
			? ["--effort", process.env["PROBE_FLAG"]]
			: []),
		"--debug",
		"--debug-file",
		process.env["PROBE_LOG"] ?? "/dev/null",
		...(pluginDir ? ["--plugin-dir", resolve(pluginDir)] : [])
	],
	{
		cwd,
		stdout: "pipe",
		stderr: "pipe",
		env: {
			...process.env,
			CLAUDE_CONFIG_DIR: config,
			ANTHROPIC_BASE_URL: `http://127.0.0.1:${server.port}`,
			ANTHROPIC_API_KEY: "sk-ant-fake",
			DISABLE_TELEMETRY: "1",
			CLAUDE_CODE_EFFORT_LEVEL: process.env["PROBE_ENV"] ?? ""
		}
	}
);
await proc.exited;
await server.stop(true);
const marks = (v: unknown, path = "", out: string[] = []): string[] => {
	if (Array.isArray(v)) v.forEach((x, i) => marks(x, `${path}[${i}]`, out));
	else if (v && typeof v === "object") {
		for (const [k, x] of Object.entries(v)) {
			if (k === "cache_control") out.push(`${path}${JSON.stringify(x)}`);
			else if (k === "effort" || k === "output_config")
				out.push(`${path}.${k}=${JSON.stringify(x)}`);
			else marks(x, `${path}.${k}`, out);
		}
	}
	return out;
};
for (const [i, b] of seen.entries()) {
	console.log(
		JSON.stringify({
			step: i,
			messages: (b["messages"] as unknown[]).length,
			output_config: b["output_config"],
			thinking: b["thinking"],
			marks: marks(b["messages"]).concat(
				marks(b["system"]).map((m) => `system${m}`)
			)
		})
	);
}
