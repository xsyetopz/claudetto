import { hasSubscriptionLogin } from "../subscription.ts";
// bun tools/handover-probe/probe.ts [--paid] [arm...]
// Runs each arm 3 times and prints one table per arm. Without --paid the API is a fake server on 127.0.0.1 and nothing is billed. With --paid a relay on 127.0.0.1 forwards each request to the real API and logs its usage, and the recall answers are scored.
import { type Arm, ARMS } from "./arms.ts";
import { renderArm } from "./report.ts";
import { runArm, type RunResult } from "./run.ts";

const RUNS = 3;
const args = process.argv.slice(2);
const paid = args.includes("--paid");
const wanted = args.filter((a) => a !== "--paid");
const arms =
	wanted.length === 0 ? ARMS : ARMS.filter((a) => wanted.includes(a.name));

const print = (line: string): void => {
	process.stdout.write(`${line}\n`);
};

/** One arm's runs, one after another. */
const runsOf = async (
	arm: Arm,
	done: RunResult[] = [],
): Promise<RunResult[]> => {
	if (done.length === RUNS) {
		return done;
	}
	return runsOf(arm, [...done, await runArm(arm, done.length + 1, paid)]);
};

const egress = (all: readonly RunResult[]): void => {
	const foreign = all.filter(
		(r) => r.hosts.length !== 1 || !r.hosts[0]?.startsWith("127.0.0.1:"),
	);
	const outside = all.flatMap((r) => r.outside);
	const requests = all.reduce((n, r) => n + r.records.length, 0);
	print("### Egress\n");
	print(
		`- ${requests} requests reached the ${paid ? "relay" : "fake server"} in ${all.length} runs; ${foreign.length} runs had a request under a host other than their own 127.0.0.1:port`,
	);
	print(
		`- ${outside.length} connection attempts to any other host reached the proxy sink${outside.length === 0 ? "" : `: ${outside.join("; ")}`}`,
	);
	print(
		paid
			? "- login: the subscription's CLAUDE_CODE_OAUTH_TOKEN; ANTHROPIC_BASE_URL: the relay, which forwards to the real API; CLAUDE_CONFIG_DIR: a temp dir per run"
			: "- key: sk-ant-fake; ANTHROPIC_BASE_URL: the fake server; CLAUDE_CONFIG_DIR: a temp dir per run",
	);
	if (!paid) {
		print("- recall: not scored, a fake model recalls nothing");
	}
	print(
		`- run dirs (requests.jsonl, debug-<phase>.log, stream-<phase>.jsonl): ${all.map((r) => r.dir).join(" ")}`,
	);
};

/** The arms run side by side, each arm's runs one after another, so a run's quiet period is not stretched by its own siblings. */
const main = async (): Promise<void> => {
	const results = await Promise.all(
		arms.map(async (arm) => ({ arm, runs: await runsOf(arm) })),
	);
	print(`# Handover probe (${paid ? "paid API" : "fake API"})\n`);
	for (const { arm, runs } of results) {
		print(renderArm(arm, runs, paid));
	}
	egress(results.flatMap((r) => r.runs));
};

if (paid && !hasSubscriptionLogin(process.env)) {
	process.stderr.write(
		"--paid needs CLAUDE_CODE_OAUTH_TOKEN in the environment (`claude setup-token` makes it): each run gets a fresh CLAUDE_CONFIG_DIR with no login, and the run bills the subscription. bunfig.toml turns off Bun's .env loading, so pass the repo's .env: `bun --env-file=.env tools/handover-probe/probe.ts --paid`.\n",
	);
	process.exitCode = 1;
} else {
	await main();
}
