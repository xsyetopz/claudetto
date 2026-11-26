// Finds where the cached prefix of two sessions' first requests first differs: two `claude -p` runs
// in two fresh folders against the fake API, with and without the plugin. The prefix is the tools,
// then each system block, in request order, as the prompt cache reads them.
// Usage: bun prefix.ts [plugin-dir]
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { startFakeApi } from "../../../tools/measure-tools/fake-api";

const pluginDir = Bun.argv[2];

async function firstRequest(): Promise<Record<string, unknown>> {
	const api = startFakeApi(false);
	const config = await mkdtemp(join(tmpdir(), "cfg-"));
	const cwd = await mkdtemp(join(tmpdir(), "work-"));
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
	return api.requests.find(
		(r) =>
			Array.isArray(r.body["tools"]) &&
			(r.body["tools"] as unknown[]).length > 0
	)!.body;
}

const parts = (b: Record<string, unknown>): [string, string][] => [
	...(b["tools"] as { name: string }[]).map((t): [string, string] => [
		`tool ${t.name}`,
		JSON.stringify(t)
	]),
	...(b["system"] as { text: string; cache_control?: unknown }[]).map(
		(s, i): [string, string] => [
			`system[${i}] cache=${JSON.stringify(s.cache_control ?? null)}`,
			s.text
		]
	)
];

const [a, b] = [parts(await firstRequest()), parts(await firstRequest())];
console.log(`arm ${pluginDir ?? "vanilla"}: ${a.length} parts`);
for (const [i, [name, text]] of a.entries()) {
	const other = b[i]?.[1];
	const same = other === text;
	let at = -1;
	if (!same && other !== undefined)
		for (at = 0; at < text.length && text[at] === other[at]; at += 1);
	console.log(
		`${same ? "same" : "DIFF"} ${name} ~${Math.round(text.length / 4)} tok${same ? "" : ` at ${at}: ${JSON.stringify(text.slice(Math.max(0, at - 60), at + 60))}`}`
	);
}
