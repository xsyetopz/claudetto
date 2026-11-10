import { mkdir, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { type Arm, OFF } from "./arms.ts";
import { eventsOf } from "./events.ts";
import { finished, readLog, resultsIn, settle, streamOf } from "./log-io.ts";
import { answersOf, errorOf, startRelay } from "./relay.ts";
import { type Fake, type LogRecord, startFake } from "./server.ts";
import { promptOf, type Turn, TURNS } from "./task.ts";

const PLUGIN_DIR = resolve(import.meta.dir, "../../plugins/claudetto");

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

interface Setup {
	readonly arm: Arm;
	readonly paid: boolean;
	readonly dir: string;
	readonly project: string;
	readonly fakePort: number;
	readonly sinkPort: number;
}

/** Phase 1 runs the arm as set; the phase after the compactions has the built-in compaction off and the handover on. */
const settingsOf = (arm: Arm, phase: 1 | 2): string => {
	const phased = arm.handoverAfterCompactions !== undefined;
	const handover = phased && phase === 1 ? OFF : arm.handoverTokens;
	return JSON.stringify({
		pluginConfigs: {
			"claudetto@inline": { options: { handoverThresholdTokens: handover } },
		},
	});
};

const envOf = (s: Setup, phase: 1 | 2): Record<string, string | undefined> => {
	const compacting = s.arm.autoCompactPct !== undefined && phase === 1;
	return {
		...process.env,
		ANTHROPIC_BASE_URL: `http://127.0.0.1:${s.fakePort}`,
		...(s.paid ? {} : { ANTHROPIC_API_KEY: "sk-ant-fake" }),
		CLAUDE_CONFIG_DIR: join(s.dir, "config"),
		HTTPS_PROXY: `http://127.0.0.1:${s.sinkPort}`,
		HTTP_PROXY: `http://127.0.0.1:${s.sinkPort}`,
		NO_PROXY: "127.0.0.1,localhost",
		CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1",
		DISABLE_TELEMETRY: "1",
		ENABLE_TOOL_SEARCH: "false",
		CLAUDE_CODE_AUTO_COMPACT_WINDOW: "200000",
		...(compacting
			? { CLAUDE_AUTOCOMPACT_PCT_OVERRIDE: String(s.arm.autoCompactPct) }
			: { DISABLE_AUTO_COMPACT: "1" }),
	};
};

const startClaude = (s: Setup, phase: 1 | 2) =>
	Bun.spawn(
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
			settingsOf(s.arm, phase),
			"--allowedTools",
			"mcp__claudetto__handoff",
			"--debug-file",
			join(s.dir, `debug-${phase}.log`),
		],
		{
			cwd: s.project,
			stdin: "pipe",
			stdout: Bun.file(join(s.dir, `stream-${phase}.jsonl`)),
			stderr: Bun.file(join(s.dir, `stderr-${phase}.txt`)),
			env: envOf(s, phase),
		},
	);
type Claude = ReturnType<typeof startClaude>;

const startSink = (outside: string[]) =>
	Bun.listen({
		hostname: "127.0.0.1",
		port: 0,
		socket: {
			data(socket, data) {
				outside.push(new TextDecoder().decode(data).split("\r\n")[0] ?? "");
				socket.end();
			},
		},
	});

interface Run {
	readonly setup: Setup;
	readonly index: number;
	readonly log: string;
	readonly fake: Fake;
	readonly sink: ReturnType<typeof startSink>;
	readonly turnOf: Map<number, number>;
	proc: Claude;
	phase: 1 | 2;
}

const send = async (proc: Claude, text: string): Promise<void> => {
	await proc.stdin.write(
		`${JSON.stringify({ type: "user", message: { role: "user", content: text } })}\n`,
	);
	await proc.stdin.flush();
};

const compactions = async (log: string): Promise<number> =>
	eventsOf(await readLog(log)).filter((e) => e.type === "compaction").length;

const playTurn = async (run: Run, i: number, turn: Turn): Promise<void> => {
	const { arm, dir } = run.setup;
	const before = resultsIn(await streamOf(dir, run.phase));
	await send(run.proc, promptOf(turn, arm));
	await finished(dir, run.phase, before);
	const error = errorOf(await streamOf(dir, run.phase));
	if (error !== undefined) {
		run.proc.kill();
		run.fake.stop();
		run.sink.stop(true);
		throw new Error(
			`arm ${arm.name} run ${run.index}, turn ${i + 1}: ${error} (run dir ${dir})`,
		);
	}
	await settle(run.log);
	for (const r of await readLog(run.log)) {
		if (!run.turnOf.has(r.n)) {
			run.turnOf.set(r.n, i);
		}
	}
	const restarts = arm.handoverAfterCompactions !== undefined;
	if (
		run.phase === 1 &&
		restarts &&
		(await compactions(run.log)) >= (arm.handoverAfterCompactions ?? 0)
	) {
		await run.proc.stdin.end();
		await run.proc.exited;
		run.phase = 2;
		run.proc = startClaude(run.setup, 2);
	}
};

const playFrom = async (run: Run, i: number): Promise<void> => {
	const turn = TURNS[i];
	if (turn === undefined) {
		return;
	}
	await playTurn(run, i, turn);
	await playFrom(run, i + 1);
};

const finish = async (
	run: Run,
	outside: readonly string[],
): Promise<RunResult> => {
	const { dir } = run.setup;
	await run.proc.stdin.end();
	await run.proc.exited;
	run.fake.stop();
	run.sink.stop(true);
	await run.fake.flushed();
	const records = await readLog(run.log);
	return {
		records,
		hosts: [...new Set(records.map((r) => r.host))],
		outside,
		dir,
		turnOf: run.turnOf,
		answers: answersOf([await streamOf(dir, 1), await streamOf(dir, 2)]),
	};
};

/** One run of one arm: a fresh scratch project and config dir, the fake API, and the plugin from the repo. Nothing leaves 127.0.0.1: a proxy sink catches any CONNECT. */
export const runArm = async (
	arm: Arm,
	index: number,
	paid: boolean,
): Promise<RunResult> => {
	const dir = await mkdtemp(
		join(process.env.TMPDIR ?? tmpdir(), `probe-${arm.name}-${index}-`),
	);
	const project = join(dir, "project");
	await mkdir(project);
	await Bun.spawn(["git", "init", "-q"], { cwd: project }).exited;
	const log = join(dir, "requests.jsonl");
	await Bun.write(log, "");
	const fake = paid
		? startRelay({
				log,
				upstream: process.env.ANTHROPIC_BASE_URL ?? "https://api.anthropic.com",
			})
		: startFake({ log, handoffOnBoundary: arm.handoffOnBoundary });
	const outside: string[] = [];
	const sink = startSink(outside);
	const setup: Setup = {
		arm,
		paid,
		dir,
		project,
		fakePort: fake.port,
		sinkPort: sink.port,
	};
	const run: Run = {
		setup,
		index,
		log,
		fake,
		sink,
		turnOf: new Map<number, number>(),
		proc: startClaude(setup, 1),
		phase: 1,
	};
	await playFrom(run, 0);
	return finish(run, outside);
};
