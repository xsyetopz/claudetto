// bun tools/handover-probe/probe.ts [--paid] [arm...]
// Runs each arm 3 times and prints one table per arm. Without --paid the API is a fake server on 127.0.0.1 and nothing is billed. With --paid a relay on 127.0.0.1 forwards each request to the real API and logs its usage, and the recall answers are scored.
import { ARMS } from "./arms.ts";
import { renderArm } from "./report.ts";
import { type RunResult, runArm } from "./run.ts";

const RUNS = 3;
const args = process.argv.slice(2);
const paid = args.includes("--paid");
const wanted = args.filter((a) => a !== "--paid");
const arms = wanted.length === 0 ? ARMS : ARMS.filter((a) => wanted.includes(a.name));

if (paid && !process.env["ANTHROPIC_API_KEY"] && !process.env["CLAUDE_CODE_OAUTH_TOKEN"]) {
	console.error(
		"--paid needs ANTHROPIC_API_KEY or CLAUDE_CODE_OAUTH_TOKEN in the environment: each run gets a fresh CLAUDE_CONFIG_DIR with no login. `claude setup-token` prints a token.",
	);
	process.exit(1);
}

/** The arms run side by side, each arm's runs one after another, so a run's quiet period is not stretched by its own siblings. */
const results = await Promise.all(
	arms.map(async (arm) => {
		const runs: RunResult[] = [];
		for (let i = 0; i < RUNS; i++) {
			runs.push(await runArm(arm, i + 1, paid));
		}
		return { arm, runs };
	}),
);

console.log(`# Handover probe (${paid ? "paid API" : "fake API"})\n`);
for (const { arm, runs } of results) {
	console.log(renderArm(arm, runs, paid));
}

const all = results.flatMap((r) => r.runs);
const foreign = all.filter((r) => r.hosts.length !== 1 || !r.hosts[0]?.startsWith("127.0.0.1:"));
const outside = all.flatMap((r) => r.outside);
const requests = all.reduce((n, r) => n + r.records.length, 0);
console.log("### Egress\n");
console.log(
	`- ${requests} requests reached the ${paid ? "relay" : "fake server"} in ${all.length} runs; ${foreign.length} runs had a request under a host other than their own 127.0.0.1:port`,
);
console.log(
	`- ${outside.length} connection attempts to any other host reached the proxy sink${outside.length === 0 ? "" : `: ${outside.join("; ")}`}`,
);
console.log(
	paid
		? "- key: the caller's; ANTHROPIC_BASE_URL: the relay, which forwards to the real API; CLAUDE_CONFIG_DIR: a temp dir per run"
		: "- key: sk-ant-fake; ANTHROPIC_BASE_URL: the fake server; CLAUDE_CONFIG_DIR: a temp dir per run",
);
if (!paid) {
	console.log("- recall: not scored, a fake model recalls nothing");
}
console.log(`- run dirs (requests.jsonl, debug-<phase>.log, stream-<phase>.jsonl): ${all.map((r) => r.dir).join(" ")}`);
