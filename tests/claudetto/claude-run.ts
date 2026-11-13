import { mkdtemp, realpath } from "node:fs/promises";
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

/** Starts the fake Messages API with `script` and a fresh config dir, and returns the env a session needs and its output folder. */
const startSession = async (script: readonly Reply[]) => {
	const out = await mkdtemp(join(tmpdir(), "claude-run-"));
	const bodies = join(out, "bodies.jsonl");
	const fake = startFake({ log: join(out, "log.jsonl"), script, bodies });
	// A fresh stamp keeps the session start from running a real `mo clean` on this machine.
	await Bun.write(join(out, "config/claudetto/mole-clean"), "");
	const env = {
		...process.env,
		ANTHROPIC_BASE_URL: `http://127.0.0.1:${fake.port}`,
		ANTHROPIC_API_KEY: "fake",
		CLAUDE_CONFIG_DIR: join(out, "config"),
		CLAUDE_CODE_MAX_RETRIES: "0",
		ENABLE_CLAUDEAI_MCP_SERVERS: "false",
	};
	const sent = async () => {
		await fake.flushed();
		fake.stop();
		return mainRequests(records(await Bun.file(bodies).text()));
	};
	return { out, env, sent };
};

/** Runs Claude Code headless with the claudetto plugin in `cwd`, against a fake Messages API that answers the main loop with `script`. The config dir is fresh, so the run reads no user setting. */
export const claudeRun = async (opts: {
	readonly cwd: string;
	readonly script: readonly Reply[];
	readonly model?: string;
}): Promise<ClaudeRun> => {
	const session = await startSession(opts.script);
	const debug = join(session.out, "debug.log");
	const proc = Bun.spawn(
		claudeArgs(opts.model ?? "claude-opus-5-5", opts.script.length + 2, debug),
		{ cwd: opts.cwd, env: session.env, stdout: "pipe", stderr: "ignore" },
	);
	const stream = await new Response(proc.stdout).text();
	await proc.exited;
	const requests = await session.sent();
	const events = records(stream);
	return {
		events,
		requests,
		debug: await Bun.file(debug).text(),
		toolResults: toolResultsOf(events),
	};
};

/** One interactive `claude` session in a terminal: read its screen as plain text, and type keys into it. */
export interface ClaudeTty {
	/** Waits until the screen text since the last call holds `text`, and fails after `ms`. */
	readonly waitFor: (text: string, ms?: number) => Promise<void>;
	readonly type: (keys: string) => void;
	/** Ends the session and returns the main loop's requests. */
	readonly end: () => Promise<readonly Json[]>;
}

/** Writes a config that has finished onboarding, approves the fake key, and trusts `cwd`, so no dialog stands before the prompt. */
const seedConfig = async (out: string, cwd: string) =>
	Bun.write(
		join(out, "config/.claude.json"),
		JSON.stringify({
			hasCompletedOnboarding: true,
			theme: "dark",
			customApiKeyResponses: { approved: ["fake"], rejected: [] },
			// Claude Code keys a project by its resolved path, such as `/private/var` for `/var`.
			projects: { [await realpath(cwd)]: { hasTrustDialogAccepted: true } },
		}),
	);

/** Returns a wait that polls `screen` until it holds `text`, then keeps only what follows the match. */
const waiter = (screen: { text: string }) => {
	const waitFor = async (text: string, ms = 15_000): Promise<void> => {
		// The terminal moves the cursor between words, so the plain text loses its spaces.
		const squeezed = text.replaceAll(" ", "");
		const plain = screen.text.replaceAll(" ", "");
		const at = plain.indexOf(squeezed);
		if (at !== -1) {
			screen.text = plain.slice(at + squeezed.length);
			return;
		}
		if (ms <= 0) {
			throw new Error(
				`the screen never showed ${JSON.stringify(text)}; it ends with:\n${screen.text.slice(-1500)}`,
			);
		}
		await Bun.sleep(100);
		return waitFor(text, ms - 100);
	};
	return waitFor;
};

/** Starts Claude Code interactive with the claudetto plugin in `cwd`, in a terminal, against a fake Messages API that answers the main loop with `script`. */
export const claudeTty = async (opts: {
	readonly cwd: string;
	readonly prompt: string;
	readonly script: readonly Reply[];
}): Promise<ClaudeTty> => {
	const session = await startSession(opts.script);
	await seedConfig(session.out, opts.cwd);
	const screen = { text: "" };
	const decoder = new TextDecoder();
	const proc = Bun.spawn(
		[
			"claude",
			opts.prompt,
			"--model",
			"claude-opus-5-5",
			"--setting-sources",
			"",
			"--plugin-dir",
			PLUGIN,
		],
		{
			cwd: opts.cwd,
			env: session.env,
			terminal: {
				cols: 120,
				rows: 40,
				data: (_terminal, bytes) => {
					screen.text += Bun.stripANSI(decoder.decode(bytes));
				},
			},
		},
	);
	return {
		waitFor: waiter(screen),
		type: (keys) => proc.terminal?.write(keys),
		end: async () => {
			proc.kill();
			await proc.exited;
			return session.sent();
		},
	};
};
