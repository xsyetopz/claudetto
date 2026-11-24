// Turn-two growth: the 2026-11-24T03-08 eval showed claudetto's second main-loop request about 5.1k
// tokens larger than vanilla's after the same tool result. A fake API answers the first request with
// one Read call and the second with text; each main-loop request body is saved, and the text blocks
// the second request adds over the first are printed per arm with their character counts.
// TOOL holds the first reply's tool call as JSON ({"tool":"Grep","input":{...}}); MODEL names the model.
// Usage: bun reports/2026-11-24-research/turn2/capture.ts
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { streamedReply } from "../../../tools/measure-tools/fake-api";

type Body = {
	tools?: { name: string; description?: string }[];
	system?: { text: string }[];
	messages: { role: string; content: unknown }[];
};

const blocks = (m: Body["messages"]): string[] =>
	m.flatMap((x) =>
		typeof x.content === "string"
			? [`${x.role}: ${x.content}`]
			: (x.content as { type: string; text?: string; content?: unknown }[]).map(
					(b) =>
						`${x.role}/${b.type}: ${b.text ?? JSON.stringify(b.content ?? "")}`
				)
	);

async function arm(plugin: boolean): Promise<void> {
	const root = await mkdtemp(join(tmpdir(), "turn2-"));
	await Bun.write(join(root, "README.md"), "# demo\n\nOne line.\n");
	const bodies: Body[] = [];
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
			const body = (await req.json()) as Body;
			const main = (body.tools?.length ?? 0) > 0;
			if (main) {
				bodies.push(body);
			}
			const reply =
				main && bodies.length === 1
					? streamedReply(
							process.env["TOOL"]
								? (JSON.parse(process.env["TOOL"]) as {
										tool: string;
										input: Record<string, unknown>;
									})
								: {
										tool: "Read",
										input: { file_path: join(root, "README.md") }
									}
						)
					: streamedReply({ text: "ok" });
			return new Response(reply, {
				headers: { "content-type": "text/event-stream" }
			});
		}
	});
	const proc = Bun.spawn(
		[
			"claude",
			"-p",
			"read the readme",
			"--model",
			process.env["MODEL"] ?? "claude-sonnet-5-5",
			"--permission-mode",
			"bypassPermissions",
			...(plugin ? ["--plugin-dir", resolve("plugins/claudetto")] : [])
		],
		{
			cwd: root,
			stdout: "ignore",
			stderr: "ignore",
			env: {
				...process.env,
				CLAUDE_CONFIG_DIR: join(root, "config"),
				ANTHROPIC_BASE_URL: `http://127.0.0.1:${server.port}`,
				ANTHROPIC_API_KEY: "sk-ant-fake",
				DISABLE_TELEMETRY: "1"
			}
		}
	);
	await proc.exited;
	await server.stop(true);
	const name = plugin ? "claudetto" : "vanilla";
	await Bun.write(
		join(import.meta.dir, `${name}.json`),
		JSON.stringify(bodies, null, 1)
	);
	const [a, b] = bodies;
	if (!a || !b) {
		console.log(`${name}: ${bodies.length} main-loop requests`);
	} else {
		const first = new Set(blocks(a.messages));
		const added = blocks(b.messages).filter((x) => !first.has(x));
		const size = (x: Body): number => JSON.stringify(x).length;
		console.log(
			`${name}: request 1 ${size(a)} chars, request 2 ${size(b)} chars`
		);
		for (const x of added) {
			console.log(`  + ${x.length} ${x.slice(0, 160).replaceAll("\n", "⏎")}`);
		}
	}
	await rm(root, { recursive: true, force: true });
}

await arm(false);
await arm(true);
