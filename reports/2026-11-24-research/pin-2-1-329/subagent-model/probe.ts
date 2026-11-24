// RISK-222 probe on vanilla claude: an Opus main session whose first reply spawns a general-purpose
// subagent with no `model`. Records the `model` of the subagent's request, with
// CLAUDE_CODE_SUBAGENT_MODEL unset and set to the value claudetto writes (hooks/settings/defaults.ts).
// Usage: bun probe.ts. Bills nothing: every request goes to 127.0.0.1.
import {
	isSubagentRequest,
	startFakeApi
} from "../../../../tools/measure-tools/fake-api";

const dir = (await Bun.$`mktemp -d`.text()).trim();
const cfg = `${dir}/cfg`;
const key = "sk-ant-fake-probe-key-0001";
await Bun.write(
	`${cfg}/.claude.json`,
	JSON.stringify({
		hasCompletedOnboarding: true,
		customApiKeyResponses: { approved: [key.slice(-20)], rejected: [] }
	})
);
for (const subagentModel of [undefined, "claude-sonnet-5-5"]) {
	const api = startFakeApi(true);
	const env: Record<string, string | undefined> = {
		...process.env,
		CLAUDE_CONFIG_DIR: cfg,
		ANTHROPIC_BASE_URL: api.url,
		ANTHROPIC_API_KEY: key,
		CLAUDE_CODE_SUBAGENT_MODEL: subagentModel
	};
	// spawnSync would block the fake API in this same process, so the run is awaited.
	const run = Bun.spawn(
		[
			"claude",
			"-p",
			"--model",
			"opus",
			"--setting-sources",
			"project",
			"--strict-mcp-config",
			"--no-session-persistence",
			"--dangerously-skip-permissions",
			"go"
		],
		{ cwd: dir, env, stdout: "ignore", stderr: "ignore" }
	);
	await run.exited;
	const sub = api.requests.filter((r) => isSubagentRequest(r.body["messages"]));
	const main = api.requests.filter(
		(r) => !isSubagentRequest(r.body["messages"])
	);
	console.log(
		`CLAUDE_CODE_SUBAGENT_MODEL=${subagentModel ?? "(unset)"}: exit ${run.exitCode}, main ${[...new Set(main.map((r) => r.body["model"]))].join(", ")}, subagent ${[...new Set(sub.map((r) => r.body["model"]))].join(", ") || "(no request)"}`
	);
	await api.stop();
}
