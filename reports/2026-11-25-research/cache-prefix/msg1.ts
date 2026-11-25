// Writes the first request's injected context message (messages[1]) of one session, split by attachment.
// Usage: [EXTRA_ARGS="--flag v"] bun msg1.ts <out-file> [plugin-dir[,plugin-dir]]
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { startFakeApi } from "../../../tools/measure-tools/fake-api";

const [out, pluginDir] = Bun.argv.slice(2);
const api = startFakeApi(false);
const config = await mkdtemp(join(tmpdir(), "cfg-"));
const cwd = process.env["CWD"] ?? (await mkdtemp(join(tmpdir(), "work-")));
const proc = Bun.spawn(
	[
		"claude",
		"-p",
		"Say ok.",
		"--no-session-persistence",
		"--model",
		"claude-haiku-5-5",
		...(process.env["EXTRA_ARGS"]?.split(" ").filter(Boolean) ?? []),
		...(pluginDir
			? pluginDir.split(",").flatMap((d) => ["--plugin-dir", resolve(d)])
			: [])
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
await Bun.write(out!, JSON.stringify(body["messages"], null, 1));
