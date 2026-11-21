// Measures the `tools` array Claude Code sends on a request, against a local fake Anthropic API.
// The fake API records each POST /v1/messages body and answers with a minimal streamed reply, so no
// request leaves the machine and nothing is billed. Each run starts from an empty CLAUDE_CONFIG_DIR,
// so only the plugin under test (--plugin-dir) differs from vanilla. The runs go in parallel; each has
// its own config dir and fake-API port.
// Usage: bun tools/measure-tools.ts [--plugin-dir <path>] [--out <file>]   Prints the results as JSON.
import { captureRun, type Run } from "./measure-tools/capture";

/** The two tool-search modes: MCP tools deferred (default), and every tool sent upfront. */
export const MODES: Readonly<Record<string, Record<string, string>>> = {
	default: {},
	upfront: { ENABLE_TOOL_SEARCH: "false" }
};

/**
 * Captures vanilla and, with a plugin, plugin runs in each mode, with and without a subagent.
 *
 * @param pluginDir The plugin to measure against vanilla, when given.
 * @returns One run per mode, subagent flag and side.
 */
export function captureAll(pluginDir: string | undefined): Promise<Run[]> {
	const sides = pluginDir === undefined ? ["vanilla"] : ["vanilla", "plugin"];
	const jobs = Object.entries(MODES).flatMap(([mode, env]) =>
		[false, true].flatMap((subagent) =>
			sides.map((side) =>
				captureRun(`${side}-${mode}${subagent ? "-subagent" : ""}`, {
					subagent,
					env,
					...(side === "plugin" && pluginDir !== undefined
						? {
								pluginDir,
								// The plugin hides the built-in agent types, so the Agent call names one of its own.
								agentType: "claudetto:Heracles"
							}
						: {})
				})
			)
		)
	);
	return Promise.all(jobs);
}

if (import.meta.main) {
	const argv = Bun.argv.slice(2);
	const flag = (name: string): string | undefined => {
		const at = argv.indexOf(name);
		return at === -1 ? undefined : argv[at + 1];
	};
	const out = flag("--out");
	const text = JSON.stringify(
		await captureAll(flag("--plugin-dir")),
		null,
		"\t"
	);
	await Bun.write(out ?? Bun.stdout, text);
}
