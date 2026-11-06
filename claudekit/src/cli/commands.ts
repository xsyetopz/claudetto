import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { planExperiment } from "../ab/ab.ts";
import { assertArm } from "../arm/arm.ts";
import { startFake } from "../fake/fake.ts";
import { checkGrader } from "../grade/grade.ts";
import { launch } from "../launcher/launcher.ts";
import { admit, readLedger } from "../ledger/ledger.ts";
import { firstSentence, readJsonOutput, readStreamJson, readTranscript, type Reply } from "../reply/reply.ts";
import { settled, settledBeforeFirstRequest, timeline } from "../timing/timing.ts";
import { clean, createRun, listRuns, planClean } from "../workspace/workspace.ts";

const DEFAULT_LEDGER = resolve(import.meta.dir, "../../ledger.jsonl");

export interface Command {
	help: string;
	run: (argv: string[]) => Promise<string>;
}

const READERS: Record<string, (text: string) => Reply> = {
	"stream-json": readStreamJson,
	json: readJsonOutput,
	transcript: readTranscript,
};

export const COMMANDS: Record<string, Command> = {
	runs: {
		help: `claudekit runs <command> ...

  list [--probe P] [--root DIR]                      runs with their id, folder, and exit code
  clean --probe P --older-than-days N [--yes]        print each run folder older than N days;
                                                     delete them only with --yes`,
		run: async (argv) => {
			const { values, positionals } = parse(argv, {
				probe: { type: "string" },
				root: { type: "string" },
				"older-than-days": { type: "string" },
				yes: { type: "boolean", default: false },
			});
			const root = values.root ? { root: values.root } : {};
			if (positionals[0] === "list") {
				const runs = await listRuns({ ...(values.probe ? { probe: values.probe } : {}), ...root });
				return runs.map((r) => `${r.id}\t${r.dir}\texit ${r.record?.exitCode ?? "-"}`).join("\n");
			}
			if (positionals[0] !== "clean") {
				throw unknown("runs", positionals[0]);
			}
			const probe = need(values.probe, "--probe");
			const days = num(need(values["older-than-days"], "--older-than-days"), "--older-than-days");
			const paths = await planClean({ probe, olderThanDays: days, ...root });
			if (values.yes) {
				await clean(paths, ...(values.root ? [values.root] : []));
			}
			return [...paths, `${paths.length} run folders ${values.yes ? "deleted" : "would be deleted; pass --yes"}`].join("\n");
		},
	},
	launch: {
		help: `claudekit launch SPEC.json --probe P

  run claude once from a launch spec (the launcher's LaunchSpec as JSON) in a new run folder`,
		run: async (argv) => {
			const { values, positionals } = parse(argv, { probe: { type: "string" } });
			const spec = await Bun.file(need(positionals[0], "SPEC.json")).json();
			const r = await launch(spec, await createRun({ probe: need(values.probe, "--probe"), quiet: true }));
			return `run ${r.run.id} ${r.run.dir}\nexit ${r.exitCode}${r.timedOut ? " (timed out)" : ""}`;
		},
	},
	fake: {
		help: `claudekit fake serve PLAN.json DIR [--forward URL]

  start the fake Messages API in its own process; print its url, this command's pid, and the server's pid;
  SIGINT or SIGTERM to this command's pid stops both`,
		run: async (argv) => {
			const { values, positionals } = parse(argv, { forward: { type: "string" } });
			if (positionals[0] !== "serve") {
				throw unknown("fake", positionals[0]);
			}
			const fake = await startFake({
				plan: await Bun.file(need(positionals[1], "PLAN.json")).json(),
				dir: need(positionals[2], "DIR"),
				...(values.forward ? { forward: values.forward } : {}),
			});
			console.log(`url ${fake.url}\npid ${process.pid}\nserver pid ${fake.pid}`);
			await new Promise<void>((done) => {
				const stop = () => {
					process.off("SIGINT", stop);
					process.off("SIGTERM", stop);
					done();
				};
				process.on("SIGINT", stop);
				process.on("SIGTERM", stop);
			});
			await fake.stop();
			return "stopped";
		},
	},
	arm: {
		help: `claudekit arm assert EXPECT.json DEBUG_LOG REQUEST.json

  check that a run loaded what EXPECT names (the arm's ArmExpect); print the diff and fail on a mismatch`,
		run: async (argv) => {
			if (argv[0] !== "assert") {
				throw unknown("arm", argv[0]);
			}
			const check = assertArm(await Bun.file(need(argv[1], "EXPECT.json")).json(), {
				debugLog: await Bun.file(need(argv[2], "DEBUG_LOG")).text(),
				firstRequest: await Bun.file(need(argv[3], "REQUEST.json")).json(),
			});
			if (!check.ok) {
				throw new Error(`arm check failed:\n${check.diff.join("\n")}`);
			}
			return "arm check ok";
		},
	},
	reply: {
		help: `claudekit reply FILE --format stream-json|json|transcript

  every assistant text segment with its turn, then the first sentence; never the .result field`,
		run: async (argv) => {
			const { values, positionals } = parse(argv, { format: { type: "string", default: "stream-json" } });
			const read = READERS[values.format as string];
			if (!read) {
				throw new Error(`--format ${JSON.stringify(values.format)}: want ${Object.keys(READERS).join(", ")}`);
			}
			const r = read(await Bun.file(need(positionals[0], "FILE")).text());
			if (!r.complete) {
				throw new Error(`reply incomplete: ${r.reason}`);
			}
			const segments = r.segments.map((s) => `turn ${s.turn} ${s.messageId}: ${JSON.stringify(s.text)}`);
			return [...segments, `first sentence: ${JSON.stringify(firstSentence(r))}`].join("\n");
		},
	},
	grade: {
		help: `claudekit grade check MODULE

  run a grader's own fixtures (the module's default export); fail when a good one fails or a bad one passes`,
		run: async (argv) => {
			if (argv[0] !== "check") {
				throw unknown("grade", argv[0]);
			}
			const report = await checkGrader((await import(resolve(need(argv[1], "MODULE")))).default);
			if (!report.ok) {
				throw new Error(`grader ${report.name} unusable: ${report.reason ?? JSON.stringify(report.failures)}`);
			}
			return `grader ${report.name} ok`;
		},
	},
	ab: {
		help: `claudekit ab plan MODULE

  print the sessions and the token bound of the experiment that MODULE exports as default; makes no call.
  A paid run starts only from the probe script itself, under --run`,
		run: async (argv) => {
			if (argv[0] !== "plan") {
				throw unknown("ab", argv[0]);
			}
			const plan = planExperiment((await import(resolve(need(argv[1], "MODULE")))).default);
			const lines = plan.sessions.map((s) => `${s.arm}\t${s.case}\t${s.index}`);
			return [...lines, `${plan.sessions.length} sessions, bound ${plan.tokenBound} tokens`].join("\n");
		},
	},
	ledger: {
		help: `claudekit ledger show [FILE] [--bound N]

  totals of the ledger (default: the kit's ledger.jsonl); with --bound, whether a run of N tokens is admitted`,
		run: async (argv) => {
			const { values, positionals } = parse(argv, { bound: { type: "string" } });
			if (positionals[0] !== "show") {
				throw unknown("ledger", positionals[0]);
			}
			const l = await readLedger(positionals[1] ?? DEFAULT_LEDGER);
			const head = `${l.entries.length} runs, ${l.totalTokens} tokens, $${l.totalUsd.toFixed(6)}`;
			if (values.bound === undefined) {
				return head;
			}
			const a = admit(l, { bound: num(values.bound, "--bound") });
			return `${head}\n${a.ok ? "admitted" : "refused"}: ${a.reason}`;
		},
	},
	timing: {
		help: `claudekit timing DEBUG_LOG [--module M --event E]

  the timeline of a debug log in ms from its first line; with --module and --event, the settles
  of that hook and whether the first one came before the first API request`,
		run: async (argv) => {
			const { values, positionals } = parse(argv, { module: { type: "string" }, event: { type: "string" } });
			const marks = timeline(await Bun.file(need(positionals[0], "DEBUG_LOG")).text());
			if (values.module === undefined || values.event === undefined) {
				return marks.filter((m) => m.kind !== "line").map((m) => `${m.at}\t${m.kind}\t${m.text}`).join("\n");
			}
			const s = settled(marks, values.module, values.event).map((m) => `${m.at}\tsettled in ${m.ms}ms`);
			const before = settledBeforeFirstRequest(marks, values.module, values.event);
			return [...s, `settled before first request: ${before ?? "unknown (a mark is missing)"}`].join("\n");
		},
	},
};

type Options = NonNullable<Parameters<typeof parseArgs>[0]>["options"];

const parse = <O extends Options>(args: string[], options: O) =>
	parseArgs({ args, options: options as O & {}, allowPositionals: true, strict: true });

const need = <T>(v: T | undefined, what: string): T => {
	if (v === undefined) {
		throw new Error(`${what}: missing`);
	}
	return v;
};

const num = (v: string, what: string): number => {
	const n = Number(v);
	if (!Number.isFinite(n)) {
		throw new Error(`${what} ${JSON.stringify(v)}: not a number`);
	}
	return n;
};

const unknown = (module: string, command: string | undefined): Error =>
	new Error(`${module} command ${JSON.stringify(command)}: unknown; see claudekit ${module} --help`);
