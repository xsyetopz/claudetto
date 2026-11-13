import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { isRecord } from "../../plugins/claudetto/hooks/tools.ts";
import { startFake } from "../../tools/fake-api/server.ts";
import type { Reply } from "../../tools/fake-api/sse.ts";

const PLUGIN = join(import.meta.dir, "../../plugins/claudetto");

type Json = Record<string, unknown>;

/** What one real `claude -p` session showed: its stream events, the bodies it sent the API, and its debug log. */
export interface ClaudeRun {
	readonly events: readonly Json[];
	/** The main loop's requests, which carry tools; a prompt hook's carry none. */
	readonly requests: readonly Json[];
	readonly debug: string;
	/** Each tool result the session sent back, as text. */
	readonly toolResults: readonly string[];
}

const records = (text: string): Json[] =>
	text
		.split("\n")
		.filter((l) => l.startsWith("{"))
		.map((l): unknown => JSON.parse(l))
		.filter((v) => isRecord(v));

const toolResultsOf = (events: readonly Json[]): string[] =>
	events
		.filter((e) => e["type"] === "user")
		.flatMap((e) => {
			const content = isRecord(e["message"]) ? e["message"]["content"] : [];
			return Array.isArray(content) ? content.filter((b) => isRecord(b)) : [];
		})
		.filter((b) => b["type"] === "tool_result")
		.map((b) =>
			typeof b["content"] === "string"
				? b["content"]
				: JSON.stringify(b["content"]),
		);

const mainRequests = (bodies: readonly Json[]): Json[] =>
	bodies
		.flatMap((b) => records(String(b["raw"])))
		.filter((r) => Array.isArray(r["tools"]) && r["tools"].length > 0);

const claudeArgs = (model: string, maxTurns: number, debug: string) => [
	"claude",
	"-p",
	"go",
	"--model",
	model,
	"--output-format",
	"stream-json",
	"--verbose",
	"--max-turns",
	String(maxTurns),
	"--no-session-persistence",
	"--setting-sources",
	"",
	"--permission-mode",
	"bypassPermissions",
	"--plugin-dir",
	PLUGIN,
	"--debug-file",
	debug,
];

/** Runs Claude Code headless with the claudetto plugin in `cwd`, against a fake Messages API that answers the main loop with `script`. The config dir is fresh, so the run reads no user setting. */
export const claudeRun = async (opts: {
	readonly cwd: string;
	readonly script: readonly Reply[];
	readonly model?: string;
}): Promise<ClaudeRun> => {
	const out = await mkdtemp(join(tmpdir(), "claude-run-"));
	const bodies = join(out, "bodies.jsonl");
	const fake = startFake({
		log: join(out, "log.jsonl"),
		script: opts.script,
		bodies,
	});
	const debug = join(out, "debug.log");
	// A fresh stamp keeps the session start from running a real `mo clean` on this machine.
	await Bun.write(join(out, "config/claudetto/mole-clean"), "");
	const proc = Bun.spawn(
		claudeArgs(opts.model ?? "claude-opus-5-5", opts.script.length + 2, debug),
		{
			cwd: opts.cwd,
			env: {
				...process.env,
				ANTHROPIC_BASE_URL: `http://127.0.0.1:${fake.port}`,
				ANTHROPIC_API_KEY: "fake",
				CLAUDE_CONFIG_DIR: join(out, "config"),
				CLAUDE_CODE_MAX_RETRIES: "0",
				ENABLE_CLAUDEAI_MCP_SERVERS: "false",
			},
			stdout: "pipe",
			stderr: "ignore",
		},
	);
	const stream = await new Response(proc.stdout).text();
	await proc.exited;
	await fake.flushed();
	fake.stop();
	const events = records(stream);
	const sent = await Bun.file(bodies).text();
	return {
		events,
		requests: mainRequests(records(sent)),
		debug: await Bun.file(debug).text(),
		toolResults: toolResultsOf(events),
	};
};
