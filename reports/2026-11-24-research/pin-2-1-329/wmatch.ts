// Usage: bun reports/2026-11-24-research/pin-2-1-329/wmatch.ts (outside the sandbox; fake API, no model)
// Vanilla 2.1.329: a scripted Write to target.json under acceptEdits, with an ask rule on Edit(path),
// on Write(path), or none. Under -p an ask that matches is refused; prints whether the file was written.
import { mkdtemp, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { streamedReply } from "../../../tools/measure-tools/fake-api";
async function arm(rule: string | null) {
	const root = await realpath(await mkdtemp(join(tmpdir(), "wmatch-")));
	const target = join(root, "work", "target.json");
	await Bun.$`mkdir -p ${join(root, "work")} ${join(root, "config")}`.quiet();
	let sent = false;
	let result = "none";
	const server = Bun.serve({
		port: 0,
		hostname: "127.0.0.1",
		async fetch(req) {
			if (
				req.method !== "POST" ||
				!new URL(req.url).pathname.startsWith("/v1/messages")
			)
				return Response.json({});
			const body = (await req.json()) as {
				tools?: unknown[];
				messages?: unknown;
			};
			const text = JSON.stringify(body.messages ?? []);
			const i = text.lastIndexOf('"tool_result"');
			if (i >= 0) result = text.slice(i, i + 220);
			const reply =
				!sent && (body.tools?.length ?? 0) > 0 && i < 0
					? ((sent = true),
						{ tool: "Write", input: { file_path: target, content: "{}\n" } })
					: { text: "ok" };
			return new Response(streamedReply(reply), {
				headers: { "content-type": "text/event-stream" }
			});
		}
	});
	const settings = JSON.stringify({
		permissions: { ask: rule ? [rule.replace("P", `/${target}`)] : [] }
	});
	const proc = Bun.spawn(
		[
			"claude",
			"-p",
			"write it",
			"--permission-mode",
			"acceptEdits",
			"--settings",
			settings
		],
		{
			cwd: join(root, "work"),
			stdout: "pipe",
			stderr: "pipe",
			env: {
				...process.env,
				CLAUDE_CONFIG_DIR: join(root, "config"),
				ANTHROPIC_BASE_URL: `http://127.0.0.1:${server.port}`,
				ANTHROPIC_API_KEY: "sk-ant-fake",
				DISABLE_TELEMETRY: "1"
			}
		}
	);
	const err = await new Response(proc.stderr).text();
	await proc.exited;
	console.log(
		`${rule ?? "no rule"}: written=${await Bun.file(target).exists()} stderr=${err.trim() || "none"} result=${result}`
	);
	server.stop(true);
	await rm(root, { recursive: true, force: true });
}
console.log(
	(await Bun.$`claude --version`.text()).trim(),
	new Date().toISOString()
);
for (const r of [null, "Edit(P)", "Write(P)"]) await arm(r);
