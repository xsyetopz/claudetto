// Prints the output-style section a session sends on its first request, in characters and UTF-8 bytes (REPLY-156).
// Usage: bun tools/measure-tools/style.ts <style-name> [plugin-dir]
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { startFakeApi } from "./fake-api";

/** Where the style section ends: the next engine section, or the end of its block. */
const ENDS = [
	"\n# MCP Server Instructions",
	"\n# Environment",
	"\nThe following deferred tools",
	"\nAvailable agent types",
	"\nThe following skills",
	"\n<total_tokens>",
	"\n\u0000\n"
];

/** Every string inside `value`, depth first. */
const stringsOf = (value: unknown): string[] => {
	if (typeof value === "string") {
		return [value];
	}
	if (Array.isArray(value)) {
		return value.flatMap((item) => stringsOf(item));
	}
	return typeof value === "object" && value !== null
		? Object.values(value).flatMap((item) => stringsOf(item))
		: [];
};

const [style = "", pluginDir = ""] = Bun.argv.slice(2);
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
		...(pluginDir === "" ? [] : ["--plugin-dir", resolve(pluginDir)])
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
	(r) => Array.isArray(r.body["tools"]) && r.body["tools"].length > 0
)?.body;
const all = [
	...stringsOf(body?.["system"]),
	...stringsOf(body?.["messages"])
].join("\n\u0000\n");
const start = all.indexOf("# Output Style:");
if (start === -1) {
	throw new Error(
		`no "# Output Style:" heading in the first request with tools`
	);
}
const rest = all.slice(start);
const end = Math.min(
	rest.length,
	...ENDS.map((mark) => rest.indexOf(mark)).filter((at) => at > 0)
);
const section = rest.slice(0, end);
process.stdout.write(
	`${JSON.stringify({ style, chars: section.length, bytes: Buffer.byteLength(section) })}\n`
);
