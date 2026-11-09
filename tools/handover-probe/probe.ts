// bun tools/handover-probe/probe.ts [arm...]
// Runs each arm 3 times against a fake Messages API on 127.0.0.1 and prints one table per arm. No paid call: the key is fake and no host but the fake server is reached.
import { ARMS } from "./arms.ts";
import { type RunResult, runArm } from "./run.ts";
import { renderArm } from "./report.ts";

const RUNS = 3;
const wanted = process.argv.slice(2);
const arms = wanted.length === 0 ? ARMS : ARMS.filter((a) => wanted.includes(a.name));

/** The arms run side by side, each arm's runs one after another, so a run's quiet period is not stretched by its own siblings. */
const results = await Promise.all(
	arms.map(async (arm) => {
		const runs: RunResult[] = [];
		for (let i = 0; i < RUNS; i++) {
			runs.push(await runArm(arm, i + 1));
		}
		return { arm, runs };
	}),
);

console.log("# Handover probe (fake API)\n");
for (const { arm, runs } of results) {
	console.log(renderArm(arm, runs));
}

const all = results.flatMap((r) => r.runs);
const foreign = all.filter((r) => r.hosts.length !== 1 || !r.hosts[0]?.startsWith("127.0.0.1:"));
const outside = all.flatMap((r) => r.outside);
const requests = all.reduce((n, r) => n + r.records.length, 0);
console.log("### Egress\n");
console.log(
	`- ${requests} requests reached the fake server in ${all.length} runs; ${foreign.length} runs had a request under a host other than their own 127.0.0.1:port`,
);
console.log(
	`- ${outside.length} connection attempts to any other host reached the proxy sink${outside.length === 0 ? "" : `: ${outside.join("; ")}`}`,
);
console.log("- key: sk-ant-fake; ANTHROPIC_BASE_URL: the fake server; CLAUDE_CONFIG_DIR: a temp dir per run");
console.log("- recall: not scored, a fake model recalls nothing; the 10 questions and the scorer are in recall.ts for the paid run");
console.log(`- run dirs (requests.jsonl, debug-<phase>.log, stream-<phase>.jsonl): ${all.map((r) => r.dir).join(" ")}`);
