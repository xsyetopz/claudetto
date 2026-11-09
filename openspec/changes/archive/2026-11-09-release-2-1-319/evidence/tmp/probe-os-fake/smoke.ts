// Hypothesis: with only the deferred openspec tool registered, the model must ToolSearch for it, and its validate call is answered by the plugin (no process, no openspec executable).
// Prediction: request 3 carries a tool_result "c: valid" for the openspec tool_use; debug.log shows the ToolSearch and the mcp__claudetto-openspec__openspec call.
const R = "/Users/krystian/CodeProjects/xsyetopz/claudetto";
const { startFake } = await import(`${R}/claudekit/src/fake/fake.ts`);
const { launch } = await import(`${R}/claudekit/src/launcher/launcher.ts`);
const { MODELS } = await import(`${R}/claudekit/src/shared/model.ts`);
const { createRun } = await import(`${R}/claudekit/src/workspace/workspace.ts`);
const run = await createRun({ probe: "os-fake", quiet: true });
const T = "mcp__claudetto-openspec__openspec";
const fake = await startFake({
	plan: {
		steps: [
			{ reply: { stop: "tool_use", blocks: [{ type: "tool_use", name: "ToolSearch", input: { query: "select:" + T, max_results: 1 } }] } },
			{ reply: { stop: "tool_use", blocks: [{ type: "tool_use", name: T, input: { action: "validate", change: "c" } }] } },
		],
		fallback: { blocks: [{ type: "text", text: "Done." }] },
	},
	dir: `${run.dir}/requests`,
});
try {
	await launch({
		prompt: "validate change c", mode: "stream-json", settingSources: ["user"], model: MODELS.haiku,
		baseUrl: fake.url, timeoutMs: 120_000, cwd: "/tmp/probe-os-fake/work",
		flags: ["--permission-mode", "bypassPermissions"],
		pluginDirs: [`${R}/plugins/claudetto-openspec`],
	}, run);
} finally { await fake.stop(); }
console.log(run.dir);
