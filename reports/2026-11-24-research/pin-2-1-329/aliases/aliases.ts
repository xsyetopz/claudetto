// REQ-SETUP-053 and REQ-REPLY-067 probe on vanilla claude: one `claude -p hi` per model alias against
// the fake API, recording the `model` of each main request, and the AskUserQuestion tool entry of a
// stream-json session with `--permission-prompt-tool stdio` (the reply.sh driver's flags).
// Usage: bun aliases.ts. Bills nothing: every request goes to 127.0.0.1.
import { startFakeApi } from "../../../../tools/measure-tools/fake-api";

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
const api = startFakeApi(false);
const env = {
	...process.env,
	CLAUDE_CONFIG_DIR: cfg,
	ANTHROPIC_BASE_URL: api.url,
	ANTHROPIC_API_KEY: key
};
const base = [
	"-p",
	"--setting-sources",
	"project",
	"--strict-mcp-config",
	"--no-session-persistence"
];
for (const alias of [
	"(none)",
	"default",
	"opus",
	"sonnet",
	"haiku",
	"opusplan"
]) {
	const before = api.requests.length;
	const model = alias === "(none)" ? [] : ["--model", alias];
	// spawnSync would block the fake API in this same process, so the run is awaited.
	const run = Bun.spawn(["claude", ...base, ...model, "hi"], {
		cwd: dir,
		env,
		stdout: "ignore",
		stderr: "ignore"
	});
	await run.exited;
	const sent = api.requests.slice(before).map((r) => r.body["model"]);
	console.log(
		`alias ${alias}: exit ${run.exitCode}, models ${[...new Set(sent)].join(", ")}`
	);
}
const before = api.requests.length;
const p = Bun.spawn(
	[
		"claude",
		...base,
		"--input-format",
		"stream-json",
		"--output-format",
		"stream-json",
		"--verbose",
		"--permission-prompt-tool",
		"stdio"
	],
	{ cwd: dir, env, stdin: "pipe", stdout: "pipe" }
);
p.stdin.write(
	`${JSON.stringify({ type: "user", message: { role: "user", content: "hi" } })}\n`
);
p.stdin.flush();
for (let i = 0; i < 100 && api.requests.length === before; i++)
	await Bun.sleep(200);
p.stdin.end();
p.kill();
const tools = (api.requests[before]?.body["tools"] ?? []) as {
	name: string;
	description?: string;
	input_schema?: unknown;
}[];
const ask = tools.find((t) => t.name === "AskUserQuestion");
const schema = JSON.stringify(ask?.input_schema ?? {});
console.log(`AskUserQuestion present: ${Boolean(ask)}`);
console.log(
	`options minItems 2: ${schema.includes('"minItems":2')}, maxItems 4: ${schema.includes('"maxItems":4')}`
);
console.log(
	`(Recommended) in description: ${(ask?.description ?? "").includes("(Recommended)") || schema.includes("(Recommended)")}`
);
const d = ask?.description ?? "";
const i = d.indexOf("(Recommended)");
console.log(
	`context: ${i >= 0 ? d.slice(Math.max(0, i - 160), i + 20).replace(/\s+/g, " ") : "-"}`
);
await api.stop();
