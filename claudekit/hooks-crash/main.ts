// Runs one interactive session with a debug log until the hooks worker crashes, the token cap is spent, the prompts are done, or the time runs out.
// bun claudekit/hooks-crash/main.ts --dir DIR --prompts FILE [--binary PATH] [--cap TOKENS] [--minutes N]
//   [--fake AGENTS] [--resume TRANSCRIPT] [--plugin-dir DIR]
// Without `--fake` the session uses this machine's config and login, so its model calls are paid.

import {
	appendFile,
	mkdir,
	readFile,
	realpath,
	writeFile,
} from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { argv, env } from "node:process";
import { type ParallelApi, startParallelApi } from "../api/parallel.ts";
import {
	fakeApiEnv,
	QUIET_ENV,
	withoutSessionVariables,
} from "../session/env.ts";
import { drive } from "./drive.ts";
import { crashLines } from "./log.ts";
import { cloneWork, fakeConfig, placeResume, projectSlug } from "./setup.ts";
import { sessionTokens } from "./tokens.ts";

const flag = (name: string): string | undefined => {
	const at = argv.indexOf(name);
	return at >= 0 ? argv[at + 1] : undefined;
};

const required = (name: string): string => {
	const value = flag(name);
	if (value === undefined) {
		throw new Error(`${name} is required; see the head of this file`);
	}
	return value;
};

const REPO = dirname(dirname(import.meta.dir));
await mkdir(required("--dir"), { recursive: true });
const dir = await realpath(required("--dir"));
const prompts: string[] = JSON.parse(
	await readFile(required("--prompts"), "utf8"),
);
const cap = Number(flag("--cap") ?? Number.POSITIVE_INFINITY);
const agents = flag("--fake");
const cwd = join(dir, "repo");
const config = join(dir, "config");
const debugLog = join(dir, "debug.log");
const events = join(dir, "events.log");
const note = async (line: string): Promise<void> => {
	const stamped = `${new Date().toISOString()} ${line}`;
	console.info(stamped);
	await appendFile(events, `${stamped}\n`);
};

await cloneWork(REPO, cwd);
let api: ParallelApi | undefined;
let sessionEnv: Record<string, string> = {
	...withoutSessionVariables(env),
	...QUIET_ENV,
	CLAUDE_CODE_DEBUG_LOG_LEVEL: "verbose",
};
if (agents !== undefined) {
	await fakeConfig(config, cwd);
	api = startParallelApi({ agents: Number(agents), rounds: 3, work: cwd });
	sessionEnv = { ...sessionEnv, ...fakeApiEnv(api.url, config) };
}
const projects =
	agents === undefined
		? join(homedir(), ".claude", "projects")
		: join(config, "projects");
const resumeFrom = flag("--resume");
const resume =
	resumeFrom === undefined
		? []
		: ["--resume", await placeResume(resumeFrom, projects, cwd)];
const pluginDir = flag("--plugin-dir");
const sessionDir = join(projects, projectSlug(cwd));

let crash: string[] = [];
let tokens = 0;
const stop = async (): Promise<string | undefined> => {
	crash = crashLines(await readFile(debugLog, "utf8").catch(() => ""));
	tokens = await sessionTokens(sessionDir);
	if (crash.length > 0) {
		return "crash";
	}
	return tokens >= cap ? "cap" : undefined;
};

try {
	const driven = await drive({
		argv: [
			flag("--binary") ?? "claude",
			...resume,
			...(pluginDir === undefined ? [] : ["--plugin-dir", pluginDir]),
			...["--debug-file", debugLog, "--permission-mode", "auto"],
		],
		cwd,
		env: sessionEnv,
		socket: join(dir, "tmux.sock"),
		prompts,
		stop,
		timeoutMs: Number(flag("--minutes") ?? 240) * 60_000,
		onPids: (pids) => writeFile(join(dir, "pids.json"), JSON.stringify(pids)),
		log: note,
	});
	await stop();
	await writeFile(
		join(dir, "report.json"),
		JSON.stringify({ ...driven, tokens, crash, sessionDir }, null, "\t"),
	);
	await note(
		`end: ${driven.reason}, ${driven.sent} prompts, ${tokens} tokens, ${crash.length} crash lines`,
	);
} finally {
	await api?.stop();
}
