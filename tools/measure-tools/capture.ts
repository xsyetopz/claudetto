import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import {
	type Captured,
	isSubagentRequest,
	mentions,
	startFakeApi,
	SUBAGENT_MARKER
} from "./fake-api";
import {
	deferredListing,
	measureTools,
	type ToolBytes,
	toolsOf
} from "./measure";

/** What one `claude -p` run captured. */
export interface Run {
	readonly label: string;
	readonly exitCode: number;
	readonly main?: ToolBytes;
	readonly subagent?: ToolBytes;
	readonly requestCount: number;
	readonly stderr: string;
	/** The raw tools arrays, for tests and reports that need descriptions. */
	readonly tools: { main?: unknown[]; subagent?: unknown[] };
	/** The main request's deferred-tool listing: the cost a deferred tool adds per request is its line here. */
	readonly deferred?: string;
}

/** What one `claude -p` run is asked to do. */
export interface RunOptions {
	readonly pluginDir?: string;
	readonly subagent: boolean;
	/** The `subagent_type` the Agent call names; a plugin run hides the built-in types, so it names one of the plugin's. */
	readonly agentType?: string;
	/** Extra `claude` arguments, such as `--permission-prompt-tool` to turn on the interactive-only tools. */
	readonly args?: readonly string[];
	/** Extra environment, such as ENABLE_TOOL_SEARCH=false to send every tool upfront. */
	readonly env?: Readonly<Record<string, string>>;
}

async function spawnClaude(
	config: string,
	api: { url: string },
	prompt: string,
	options: RunOptions
): Promise<{ stderr: string; exitCode: number }> {
	const proc = Bun.spawn(
		[
			"claude",
			"-p",
			prompt,
			"--no-session-persistence",
			...(options.args ?? []),
			...(options.pluginDir === undefined
				? []
				: ["--plugin-dir", resolve(options.pluginDir)])
		],
		{
			cwd: config,
			stdout: "pipe",
			stderr: "pipe",
			env: {
				...process.env,
				CLAUDE_CONFIG_DIR: config,
				ANTHROPIC_BASE_URL: api.url,
				ANTHROPIC_API_KEY: "sk-ant-fake",
				DISABLE_TELEMETRY: "1",
				...options.env
			}
		}
	);
	const [, stderr, exitCode] = await Promise.all([
		new Response(proc.stdout).text(),
		new Response(proc.stderr).text(),
		proc.exited
	]);
	return { stderr, exitCode };
}

const withTools = (requests: readonly Captured[]): Captured[] =>
	requests.filter((r) => toolsOf(r.body).length > 0);

/** The two requests a run is measured on: the main loop's first and the subagent's first. */
function pickRequests(requests: readonly Captured[]): {
	main: Captured | undefined;
	sub: Captured | undefined;
} {
	const candidates = withTools(requests);
	return {
		main: candidates.find(
			(r) => !mentions(r.body["messages"], SUBAGENT_MARKER)
		),
		sub: candidates.find((r) => isSubagentRequest(r.body["messages"]))
	};
}

function summarize(
	label: string,
	api: { requests: Captured[] },
	result: { stderr: string; exitCode: number }
): Run {
	const { main, sub } = pickRequests(api.requests);
	const mainTools = main === undefined ? undefined : toolsOf(main.body);
	const subTools = sub === undefined ? undefined : toolsOf(sub.body);
	const deferred =
		main === undefined ? undefined : deferredListing(main.body["messages"]);
	return {
		label,
		exitCode: result.exitCode,
		requestCount: api.requests.length,
		stderr: result.stderr.slice(0, 2000),
		...(mainTools === undefined ? {} : { main: measureTools(mainTools) }),
		...(subTools === undefined ? {} : { subagent: measureTools(subTools) }),
		...(deferred === undefined ? {} : { deferred }),
		tools: {
			...(mainTools === undefined ? {} : { main: mainTools }),
			...(subTools === undefined ? {} : { subagent: subTools })
		}
	};
}

/**
 * Runs `claude -p` against the fake API from an empty config dir and measures the tools it sent.
 * A plugin run first runs one plain `-p hi` in the same config dir: the plugin's session.start hook
 * writes its settings defaults (the deny list among them) into that dir, and they bind from the next
 * session on, so the measured run is the plugin's steady state.
 *
 * @param label A name for the run.
 * @param options The plugin to load, whether to make the model call a subagent, and extra env.
 * @returns The measured run.
 */
export async function captureRun(
	label: string,
	options: RunOptions
): Promise<Run> {
	const config = await mkdtemp(join(tmpdir(), "measure-tools-"));
	const api = startFakeApi(options.subagent, options.agentType);
	try {
		if (options.pluginDir !== undefined) {
			const warm = startFakeApi(false);
			try {
				await spawnClaude(config, warm, "hi", options);
			} finally {
				await warm.stop();
			}
		}
		const result = await spawnClaude(
			config,
			api,
			options.subagent ? "Use the Agent tool once, then stop." : "hi",
			options
		);
		return summarize(label, api, result);
	} finally {
		await api.stop();
		await rm(config, { recursive: true, force: true });
	}
}
