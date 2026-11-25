// Prints each system block of a captured first request: its size, cache_control and opening text.
// Usage: bun dump.ts [plugin-dir]
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { startFakeApi } from "../../../tools/measure-tools/fake-api";

const api = startFakeApi(false);
const config = await mkdtemp(join(tmpdir(), "cfg-"));
const cwd = await mkdtemp(join(tmpdir(), "work-"));
const pluginDir = Bun.argv[2];
const proc = Bun.spawn(
	[
		"claude",
		"-p",
		"Say ok.",
		"--no-session-persistence",
		"--model",
		"claude-haiku-5-5",
		...(pluginDir ? ["--plugin-dir", resolve(pluginDir)] : [])
	],
	{
		cwd,
		stdout: "pipe",
		stderr: "pipe",
		env: {
			...process.env,
			CLAUDE_CONFIG_DIR: config,
			ANTHROPIC_BASE_URL: api.url,
			ANTHROPIC_API_KEY: "sk-ant-fake",
			DISABLE_TELEMETRY: "1"
		}
	}
);
await proc.exited;
await api.stop();
const body = api.requests.find(
	(r) =>
		Array.isArray(r.body["tools"]) && (r.body["tools"] as unknown[]).length > 0
)!.body;
for (const s of body["system"] as { text: string; cache_control?: unknown }[]) {
	console.log(
		Math.round(s.text.length / 4),
		JSON.stringify(s.cache_control ?? null),
		JSON.stringify(s.text.slice(0, 100))
	);
	for (const h of s.text.match(/^#+ .*$/gmu) ?? []) console.log("   ", h);
}
const m = body["messages"] as { role: string; content: unknown }[];
for (const [i, msg] of m.entries())
	for (const c of (Array.isArray(msg.content)
		? msg.content
		: [{ text: msg.content }]) as { text?: string; cache_control?: unknown }[])
		console.log(
			`msg${i}`,
			Math.round((c.text ?? "").length / 4),
			JSON.stringify(c.cache_control ?? null),
			JSON.stringify((c.text ?? "").slice(0, 90))
		);
