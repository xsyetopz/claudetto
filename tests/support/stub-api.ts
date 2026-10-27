// A stub of the Messages API and a `claude` run against it, with no login and no cost.
// The stub saves each request body and answers each request with the text `done`, or with tool calls.
// The run has a new `CLAUDE_CONFIG_DIR` and `HOME`, so it reads no settings, plugins, or rules of the host.

import { mkdir, mkdtemp, realpath, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { StringDecoder } from "node:string_decoder";
import { file, serve, sleep, spawn, write } from "bun";
import { STUB_RUN_TIMEOUT_MS } from "../../tools/limits.ts";

export interface Capture {
	/** The bodies of the `/v1/messages` requests, in order. */
	requests: Record<string, unknown>[];
	/** The messages of `--output-format stream-json`, with the `system` `init` message first, or none in a terminal run. */
	events: Record<string, unknown>[];
	/** The text of the `--debug-file` log. */
	debug: string;
	/** The raw output of a terminal run, with its escape sequences, or an empty text. */
	screen: string;
}

export interface Run {
	prompt?: string;
	/** More flags of `claude`, such as `--permission-mode plan`. */
	args?: string[];
	/** The tool calls of the first answer, so that the next request carries their results. */
	calls?: { name: string; input: object }[];
	/** The `input_tokens` that each answer reports, such as a count near the compaction threshold. */
	tokens?: number;
	/** Writes files into the new config folder and project before the run. */
	prepare?: (dirs: { config: string; project: string }) => void;
	/** Runs Claude Code in a terminal, and stops it when the screen text matches. */
	until?: RegExp;
}

/** A `prepare` that saves session `id` with the rows of `rowsOf(project)` where Claude Code finds it for `--resume`. */
export const seedSession =
	(
		id: string,
		rowsOf: (project: string) => string,
	): NonNullable<Run["prepare"]> =>
	async ({ config, project }) => {
		const real = await realpath(project);
		const dir = path.join(
			config,
			"projects",
			real.replace(/[^a-zA-Z0-9]/g, "-"),
		);
		await mkdir(dir, { recursive: true });
		await write(path.join(dir, `${id}.jsonl`), rowsOf(real));
	};

const ESC = String.fromCharCode(27);
const BEL = String.fromCharCode(7);
/** The start of a terminal title, `OSC 0`. */
export const TITLE = `${ESC}]0;`;
const MOVE = new RegExp(`${ESC}\\[\\d*[CG]`, "g");
const SEQUENCE = new RegExp(
	`${ESC}\\][^${BEL}]*${BEL}|${ESC}\\[[0-9;?<>=]*[a-zA-Z~]|${ESC}.`,
	"g",
);

/** The text of terminal output with no escape sequences, and a space for each cursor move to the right or to a column. */
export const plain = (screen: string): string =>
	screen.replace(MOVE, " ").replace(SEQUENCE, "");

type Block = Record<string, unknown> & { type: string };

/** The stream of one answer: the tool calls `calls`, or the text `done` when there is none. */
const sse = (model: string, calls: Run["calls"] = [], tokens = 1): string => {
	const blocks: [Block, object][] =
		calls.length > 0
			? calls.map(({ name, input }, i) => [
					{ type: "tool_use", id: `toolu_stub_${i}`, name, input: {} },
					{ type: "input_json_delta", partial_json: JSON.stringify(input) },
				])
			: [
					[
						{ type: "text", text: "" },
						{ type: "text_delta", text: "done" },
					],
				];
	const events: [string, object][] = [
		[
			"message_start",
			{
				message: {
					id: "msg_stub",
					type: "message",
					role: "assistant",
					model,
					content: [],
					stop_reason: null,
					stop_sequence: null,
					usage: { input_tokens: tokens, output_tokens: 1 },
				},
			},
		],
		...blocks.flatMap(([content_block, delta], index): [string, object][] => [
			["content_block_start", { index, content_block }],
			["content_block_delta", { index, delta }],
			["content_block_stop", { index }],
		]),
		[
			"message_delta",
			{
				delta: {
					stop_reason: calls.length > 0 ? "tool_use" : "end_turn",
					stop_sequence: null,
				},
				usage: { output_tokens: 1 },
			},
		],
		["message_stop", {}],
	];
	return events
		.map(
			([type, data]) =>
				`event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`,
		)
		.join("");
};

/** The output of `argv` in a terminal, read until its text matches `until` or the run ends. */
const inTerminal = async (
	argv: string[],
	options: { cwd: string; env: Record<string, string> },
	until: RegExp,
): Promise<string> => {
	let screen = "";
	// A stream decoder, because a chunk can end inside a character.
	const decoder = new StringDecoder("utf8");
	const run = spawn(argv, {
		...options,
		terminal: {
			cols: 120,
			rows: 40,
			data: (_terminal, data) => {
				screen += decoder.write(Buffer.from(data));
			},
		},
	});
	const end = Date.now() + STUB_RUN_TIMEOUT_MS;
	const poll = async (): Promise<void> => {
		if (
			until.test(plain(screen)) ||
			Date.now() >= end ||
			run.exitCode !== null
		) {
			return;
		}
		await sleep(100);
		await poll();
	};
	await poll();
	run.kill();
	await run.exited;
	return screen;
};

/** The stream-json messages of a run of `argv` with `-p`. */
const headless = async (
	argv: string[],
	options: { cwd: string; env: Record<string, string> },
): Promise<Capture["events"]> => {
	// An async spawn, because a sync spawn blocks the stub server of this process.
	const run = spawn(
		[...argv, "-p", "--output-format", "stream-json", "--verbose"],
		{
			...options,
			stdout: "pipe",
			stderr: "ignore",
			timeout: STUB_RUN_TIMEOUT_MS,
		},
	);
	const out = await new Response(run.stdout).text();
	await run.exited;
	return out
		.split("\n")
		.filter((line) => line.startsWith("{"))
		.map((line): Record<string, unknown> => JSON.parse(line));
};

const isRecord = (v: unknown): v is Record<string, unknown> =>
	v !== null && typeof v === "object" && !Array.isArray(v);

/** The `command` of a tool call `input`, as a text. */
const commandOf = (input: object): string =>
	"command" in input ? String(input.command) : "";

/** Runs `claude` with `settings` as the user settings, and returns what the stub saw and what Claude Code wrote. */
export const stubCapture = async (
	settings: object,
	{ prompt = "say hi", args = [], calls, tokens, prepare, until }: Run = {},
): Promise<Capture> => {
	const requests: Capture["requests"] = [];
	const server = serve({
		port: 0,
		hostname: "127.0.0.1",
		fetch: async (req) => {
			if (new URL(req.url).pathname !== "/v1/messages") {
				return new Response(null, { status: 404 });
			}
			const body = await req.json();
			if (!isRecord(body)) {
				return new Response(null, { status: 400 });
			}
			requests.push(body);
			// Only the first answer calls the tools, so the run ends after one tool turn.
			const first = requests.length === 1 ? calls : [];
			return new Response(sse(String(body["model"]), first, tokens), {
				headers: { "content-type": "text/event-stream" },
			});
		},
	});
	// The real path, because Claude Code names the memory folder of the project by it.
	const root = await realpath(
		await mkdtemp(path.join(os.tmpdir(), "stub-capture-")),
	);
	const config = path.join(root, "config");
	const project = path.join(root, "project");
	await Promise.all([mkdir(config), mkdir(project)]);
	await write(path.join(config, "settings.json"), JSON.stringify(settings));
	// The state of a finished first start, so that a terminal run shows no onboarding, trust, or key dialog.
	await write(
		path.join(config, ".claude.json"),
		JSON.stringify({
			hasCompletedOnboarding: true,
			theme: "dark",
			customApiKeyResponses: { approved: ["sk-ant-dummy".slice(-20)] },
			projects: { [project]: { hasTrustDialogAccepted: true } },
		}),
	);
	const debugFile = path.join(root, "debug.log");
	const argv = [
		"claude",
		prompt,
		"--debug-file",
		debugFile,
		...(calls ?? []).flatMap(({ name, input }) =>
			name === "Bash" ? ["--allowedTools", `Bash(${commandOf(input)})`] : [],
		),
		...args,
	];
	const options = {
		cwd: project,
		env: {
			PATH: process.env["PATH"] ?? "",
			HOME: root,
			TERM: "xterm-256color",
			SHELL: "/bin/zsh",
			CLAUDE_CONFIG_DIR: config,
			ANTHROPIC_API_KEY: "sk-ant-dummy",
			ANTHROPIC_BASE_URL: `http://127.0.0.1:${server.port}`,
			CLAUDE_CODE_MAX_RETRIES: "0",
		},
	};
	try {
		await spawn(["git", "init", "-q"], { cwd: project }).exited;
		await prepare?.({ config, project });
		const screen = until ? await inTerminal(argv, options, until) : "";
		const events = until ? [] : await headless(argv, options);
		const log = file(debugFile);
		const debug = (await log.exists()) ? await log.text() : "";
		return { requests, events, debug, screen };
	} finally {
		server.stop(true);
		await rm(root, { recursive: true, force: true });
	}
};
