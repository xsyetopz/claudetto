// Prints the output-style text a session sends on its first request, as UTF-8 bytes and characters.
// Usage: bun style.ts <style-name> [plugin-dir]
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { startFakeApi } from "../../../tools/measure-tools/fake-api";

const [style, pluginDir] = Bun.argv.slice(2);
const api = startFakeApi(false);
const config = await mkdtemp(join(tmpdir(), "cfg-"));
const cwd = await mkdtemp(join(tmpdir(), "work-"));
await Bun.write(join(cwd, "s.json"), JSON.stringify({ outputStyle: style }));
const proc = Bun.spawn(
	[
		"claude",
		"-p",
		"Say ok.",
		"--no-session-persistence",
		"--model",
		"claude-haiku-5-5",
		"--settings",
		join(cwd, "s.json"),
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
const texts: string[] = [];
const walk = (v: unknown): void => {
	if (typeof v === "string") texts.push(v);
	else if (Array.isArray(v)) v.forEach(walk);
	else if (v && typeof v === "object") Object.values(v).forEach(walk);
};
walk(body["system"]);
walk(body["messages"]);
const all = texts.join("\n\u0000\n");
const start = all.indexOf("# Output Style:");
if (start < 0) {
	console.log("no '# Output Style:' heading; blocks holding 'Style Active':");
	for (const t of texts.filter((t) => t.includes("Style Active")))
		console.log(t.slice(0, 300), "...", t.length);
	process.exit(1);
}
// The style section runs to the next engine section ("\n# MCP", "\n# Environment") or the block end.
const rest = all.slice(start);
const ends = [
	"\n# MCP Server Instructions",
	"\n# Environment",
	"\nThe following deferred tools",
	"\nAvailable agent types",
	"\nThe following skills",
	"\n<total_tokens>",
	"\n\u0000\n"
]
	.map((m) => rest.indexOf(m))
	.filter((i) => i > 0);
const section = rest.slice(0, Math.min(...ends, rest.length));
if (process.env["DUMP"]) await Bun.write(process.env["DUMP"], section);
console.log(
	JSON.stringify({
		style,
		chars: section.length,
		bytes: Buffer.byteLength(section),
		head: section.slice(0, 80),
		tail: section.slice(-80)
	})
);
