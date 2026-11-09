import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { type Arm, OFF } from "./arms.ts";
import { eventsOf } from "./events.ts";
import { answersOf, errorOf, resultsOf, startRelay } from "./relay.ts";
import { type LogRecord, startFake } from "./server.ts";
import { promptOf, TURNS } from "./task.ts";

const PLUGIN_DIR = resolve(import.meta.dir, "../../plugins/claudetto");
const SETTLE_MS = 1_500;
const TURN_TIMEOUT_MS = 600_000;

export interface RunResult {
	readonly records: readonly LogRecord[];
	/** Hosts that a request reached the fake server under, and the CONNECTs a proxy sink caught for any other host. */
	readonly hosts: readonly string[];
	readonly outside: readonly string[];
	readonly dir: string;
	readonly turnOf: ReadonlyMap<number, number>;
	/** The results of the last 10 turns: the recall answers. */
	readonly answers: readonly string[];
}

const readLog = (path: string): LogRecord[] =>
	readFileSync(path, "utf8")
		.split("\n")
		.filter((l) => l !== "")
		.map((l) => JSON.parse(l) as LogRecord);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Phase 2 runs only in an arm that restarts, so its file may not exist. */
const streamOf = (dir: string, phase: 1 | 2): string => {
	const path = join(dir, `stream-${phase}.jsonl`);
	return existsSync(path) ? readFileSync(path, "utf8") : "";
};

const resultsIn = (stream: string): number => resultsOf([stream]).length;

/** Waits for the turn's `result` line: a real turn can pause longer than the quiet period between its requests. */
const finished = async (dir: string, phase: 1 | 2, before: number): Promise<void> => {
	const start = Date.now();
	while (resultsIn(streamOf(dir, phase)) <= before && Date.now() - start < TURN_TIMEOUT_MS) {
		await sleep(200);
	}
};

/** Waits until the server log has been quiet for `SETTLE_MS`: a handover or a clear runs from a timer after the turn's result. */
const settle = async (log: string): Promise<void> => {
	const start = Date.now();
	let last = readLog(log).length;
	let quietSince = Date.now();
	while (Date.now() - quietSince < SETTLE_MS && Date.now() - start < TURN_TIMEOUT_MS) {
		await sleep(200);
		const now = readLog(log).length;
		if (now !== last) {
			last = now;
			quietSince = Date.now();
		}
	}
};

/** One run of one arm: a fresh scratch project and config dir, the fake API, and the plugin from the repo. Nothing leaves 127.0.0.1: a proxy sink catches any CONNECT. */
export const runArm = async (arm: Arm, index: number, paid: boolean): Promise<RunResult> => {
	const dir = mkdtempSync(join(process.env["TMPDIR"] ?? tmpdir(), `probe-${arm.name}-${index}-`));
	const project = join(dir, "project");
	mkdirSync(project);
	Bun.spawnSync(["git", "init", "-q"], { cwd: project });
	const log = join(dir, "requests.jsonl");
	writeFileSync(log, "");
	const fake = paid
		? startRelay({ log, upstream: process.env["ANTHROPIC_BASE_URL"] ?? "https://api.anthropic.com" })
		: startFake({ log, handoffOnBoundary: arm.handoffOnBoundary });
	const outside: string[] = [];
	const sink = Bun.listen({
		hostname: "127.0.0.1",
		port: 0,
		socket: {
			data(socket, data) {
				outside.push(new TextDecoder().decode(data).split("\r\n")[0] ?? "");
				socket.end();
			},
		},
	});
	const phased = arm.handoverAfterCompactions !== undefined;
	/** Phase 1 runs the arm as set; the phase after the compactions has the built-in compaction off and the handover on. */
	const start = (phase: 1 | 2) => {
		const handover = phased && phase === 1 ? OFF : arm.handoverTokens;
		const compacting = arm.autoCompactPct !== undefined && phase === 1;
		const settings = {
			pluginConfigs: {
				"claudetto@inline": {
					options: { handoverThresholdTokens: handover },
				},
			},
		};
		return Bun.spawn(
		[
			"claude",
			"-p",
			...(phase === 2 ? ["--continue"] : []),
			"--input-format",
			"stream-json",
			"--output-format",
			"stream-json",
			"--verbose",
			"--plugin-dir",
			PLUGIN_DIR,
			"--settings",
			JSON.stringify(settings),
			"--allowedTools",
			"mcp__claudetto__handoff",
			"--debug-file",
			join(dir, `debug-${phase}.log`),
		],
		{
			cwd: project,
			stdin: "pipe",
			stdout: Bun.file(join(dir, `stream-${phase}.jsonl`)),
			stderr: Bun.file(join(dir, `stderr-${phase}.txt`)),
			env: {
				...process.env,
				ANTHROPIC_BASE_URL: `http://127.0.0.1:${fake.port}`,
				...(paid ? {} : { ANTHROPIC_API_KEY: "sk-ant-fake" }),
				CLAUDE_CONFIG_DIR: join(dir, "config"),
				HTTPS_PROXY: `http://127.0.0.1:${sink.port}`,
				HTTP_PROXY: `http://127.0.0.1:${sink.port}`,
				NO_PROXY: "127.0.0.1,localhost",
				CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1",
				DISABLE_TELEMETRY: "1",
				ENABLE_TOOL_SEARCH: "false",
				CLAUDE_CODE_AUTO_COMPACT_WINDOW: "200000",
				...(compacting
					? { CLAUDE_AUTOCOMPACT_PCT_OVERRIDE: String(arm.autoCompactPct) }
					: { DISABLE_AUTO_COMPACT: "1" }),
			},
		},
		);
	};
	const turnOf = new Map<number, number>();
	let phase: 1 | 2 = 1;
	let proc = start(phase);
	const send = (text: string) => {
		proc.stdin.write(
			`${JSON.stringify({ type: "user", message: { role: "user", content: text } })}\n`,
		);
		proc.stdin.flush();
	};
	const compactions = () =>
		eventsOf(readLog(log)).filter((e) => e.type === "compaction").length;
	for (const [i, turn] of TURNS.entries()) {
		const before = resultsIn(streamOf(dir, phase));
		send(promptOf(turn, arm));
		await finished(dir, phase, before);
		const error = errorOf(streamOf(dir, phase));
		if (error !== undefined) {
			proc.kill();
			fake.stop();
			sink.stop(true);
			throw new Error(`arm ${arm.name} run ${index}, turn ${i + 1}: ${error} (run dir ${dir})`);
		}
		await settle(log);
		for (const r of readLog(log)) {
			if (!turnOf.has(r.n)) {
				turnOf.set(r.n, i);
			}
		}
		if (phase === 1 && phased && compactions() >= (arm.handoverAfterCompactions ?? 0)) {
			proc.stdin.end();
			await proc.exited;
			phase = 2;
			proc = start(phase);
		}
	}
	proc.stdin.end();
	await proc.exited;
	fake.stop();
	sink.stop(true);
	const records = readLog(log);
	return {
		records,
		hosts: [...new Set(records.map((r) => r.host))],
		outside,
		dir,
		turnOf,
		answers: answersOf([streamOf(dir, 1), streamOf(dir, 2)]),
	};
};
