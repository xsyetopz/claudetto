import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import type { Message } from "../fixture/fixture.ts";
import { seedTranscript } from "../replay/replay.ts";
import { isRecord } from "../shared/record.ts";
import {
	type Run,
	type RunRecord,
	writeRecord,
} from "../workspace/workspace.ts";

const FAKE_KEY = "sk-ant-fake-key-for-local-fake";
const BASE_ENV = {
	DISABLE_TELEMETRY: "1",
	DISABLE_AUTOUPDATER: "1",
	CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1",
};
const KILL_GRACE_MS = 2000;

export type Mode = "json" | "stream-json" | "text";
export type SettingSource = "user" | "project" | "local";

export interface LaunchSpec {
	prompt: string;
	// Earlier turns, seeded as a transcript and resumed, so the prompt answers them.
	prefix?: Message[];
	mode: Mode;
	model: string;
	pluginDirs?: string[];
	settings?: Record<string, unknown>;
	settingSources?: SettingSource[];
	env?: Record<string, string>;
	// Names copied from the parent env without being printed or recorded, so a token passes by reference.
	passEnv?: string[];
	flags?: string[];
	cwd?: string;
	baseUrl?: string;
	// "login" uses the user's claude.ai login, which a fresh CLAUDE_CONFIG_DIR cannot see and which needs USER.
	auth?: "fake" | "login";
	// Writes the session transcript under the config folder, for a hook that reads `transcript_path`.
	persist?: boolean;
	timeoutMs?: number;
	arm?: string;
	case?: string;
	pluginTreeHashes?: Record<string, string>;
}

export interface Launch {
	argv: string[];
	env: Record<string, string>;
	cwd: string;
	files: RunFiles;
}

export interface RunFiles {
	stdout: string;
	stderr: string;
	debug: string;
	settings: string;
	config: string;
	work: string;
}

export interface LaunchResult {
	run: Run;
	exitCode: number | null;
	timedOut: boolean;
	durationMs: number;
	files: RunFiles;
	record: RunRecord;
}

export interface OptionError {
	plugin: string;
	option: string;
	message: string;
}

export const runFiles = (run: Run): RunFiles => ({
	stdout: join(run.dir, "stdout.txt"),
	stderr: join(run.dir, "stderr.txt"),
	debug: join(run.dir, "debug.log"),
	settings: join(run.dir, "settings.json"),
	config: join(run.dir, "config"),
	work: join(run.dir, "work"),
});

// Pure: the argv and env of one launch. Nothing is read from the parent env except the passEnv names and HOME, PATH, TMPDIR, plus USER under the login.
export const buildLaunch = (
	spec: LaunchSpec,
	run: Run,
	parentEnv: Record<string, string | undefined> = process.env,
): Launch => {
	const files = runFiles(run);
	const argv = [
		"claude",
		"-p",
		"--output-format",
		spec.mode,
		// json prints every frame only with --verbose; stream-json requires it.
		...(spec.mode === "text" ? [] : ["--verbose"]),
		"--model",
		spec.model,
		...(spec.persist ? [] : ["--no-session-persistence"]),
		"--debug-file",
		files.debug,
		"--setting-sources",
		(spec.settingSources ?? []).join(","),
		"--settings",
		files.settings,
		...(spec.pluginDirs ?? []).flatMap((d) => ["--plugin-dir", d]),
		...(spec.flags ?? []),
		"--",
		spec.prompt,
	];
	return {
		argv,
		env: launchEnv(spec, files, parentEnv),
		cwd: spec.cwd ?? files.work,
		files,
	};
};

export const launchEnv = (
	spec: Pick<LaunchSpec, "env" | "passEnv" | "baseUrl" | "auth">,
	files: Pick<RunFiles, "config">,
	parentEnv: Record<string, string | undefined>,
	term = "dumb",
): Record<string, string> => {
	const login = spec.auth === "login";
	const env: Record<string, string> = {
		...BASE_ENV,
		TERM: term,
		// The login also brings the account's claude.ai connectors, which load async and can reach the first request
		// in one run of three and not the others.
		...(login ? { ENABLE_CLAUDEAI_MCP_SERVERS: "false" } : { CLAUDE_CONFIG_DIR: files.config }),
	};
	for (const name of ["HOME", "PATH", "TMPDIR", ...(login ? ["USER"] : []), ...(spec.passEnv ?? [])]) {
		const v = parentEnv[name];
		if (v !== undefined) {
			env[name] = v;
		}
	}
	if (spec.baseUrl) {
		env.ANTHROPIC_BASE_URL = spec.baseUrl;
		if (!login) {
			env.ANTHROPIC_API_KEY = FAKE_KEY;
		}
	}
	return { ...env, ...spec.env };
};

// Checks settings.pluginConfigs[name].options against each plugin's userConfig before any call.
export const checkOptions = async (
	spec: Pick<LaunchSpec, "settings" | "pluginDirs">,
): Promise<OptionError[]> => {
	const manifests = await Promise.all(
		(spec.pluginDirs ?? []).map(readManifest),
	);
	const errors: OptionError[] = [];
	for (const [key, options] of pluginOptions(spec.settings)) {
		const name = key.split("@")[0] ?? key;
		const manifest = manifests.find((m) => m.name === name);
		if (!manifest) {
			errors.push({
				plugin: key,
				option: "*",
				message: `unknown plugin: ${name}`,
			});
			continue;
		}
		for (const [option, value] of Object.entries(options)) {
			const message = checkValue(manifest.userConfig?.[option], value);
			if (message) {
				errors.push({ plugin: key, option, message });
			}
		}
	}
	return errors;
};

// Settings come from a probe author, so their shape is checked here.
const pluginOptions = (
	settings: Record<string, unknown> | undefined,
): [string, Record<string, unknown>][] => {
	const configs = settings?.pluginConfigs;
	if (!isRecord(configs)) {
		return [];
	}
	return Object.entries(configs).map(([key, cfg]) => [
		key,
		isRecord(cfg) && isRecord(cfg.options) ? cfg.options : {},
	]);
};

export const claudeVersion = async (
	env: Record<string, string>,
): Promise<string> => {
	const proc = Bun.spawn(["claude", "--version"], {
		env,
		stdin: "ignore",
		stdout: "pipe",
		stderr: "ignore",
	});
	const out = await new Response(proc.stdout).text();
	await proc.exited;
	return out.trim().split(" ")[0] ?? "";
};

// Async only, so a fake in this process can still answer.
export const launch = async (
	spec: LaunchSpec,
	run: Run,
): Promise<LaunchResult> => {
	const errors = await checkOptions(spec);
	if (errors.length > 0) {
		throw new Error(
			`bad plugin options:\n${errors.map((e) => `  ${e.plugin}.${e.option}: ${e.message}`).join("\n")}`,
		);
	}
	const base = buildLaunch(spec, run);
	await prepare(spec, base);
	// The login reads the default config folder (F17), so a login run's seed goes there and is removed after the run.
	const seed = spec.prefix
		? await seedTranscript(spec.auth === "login" ? join(base.env.HOME ?? "", ".claude") : base.files.config, base.cwd, spec.prefix)
		: undefined;
	const l = seed ? buildLaunch({ ...spec, flags: [...(spec.flags ?? []), "--resume", seed.id, "--fork-session"] }, run) : base;
	try {
		return await spawnRun(spec, run, l, seed?.path);
	} finally {
		if (seed) {
			await rm(seed.path, { force: true });
		}
	}
};

const spawnRun = async (spec: LaunchSpec, run: Run, l: Launch, seed: string | undefined): Promise<LaunchResult> => {
	const record = { ...(await startRecord(spec, run, l)), ...(seed ? { seed } : {}) };
	const started = performance.now();
	const proc = Bun.spawn(l.argv, {
		env: l.env,
		cwd: l.cwd,
		stdin: "ignore",
		stdout: Bun.file(l.files.stdout),
		stderr: Bun.file(l.files.stderr),
	});
	record.pid = proc.pid;
	await writeRecord(run, record);
	let timedOut = false;
	const timer = setTimeout(() => {
		timedOut = true;
		killPid(proc.pid);
	}, spec.timeoutMs ?? 300_000);
	const exitCode = await proc.exited;
	clearTimeout(timer);
	const done = {
		...record,
		endedAt: new Date().toISOString(),
		exitCode,
		timedOut,
	};
	await writeRecord(run, done);
	return {
		run,
		exitCode,
		timedOut,
		durationMs: performance.now() - started,
		files: l.files,
		record: done,
	};
};

// Stops only the pid this kit recorded in run.json, never by a name pattern.
export const stop = async (run: Run): Promise<boolean> => {
	const record: RunRecord = await Bun.file(join(run.dir, "run.json")).json();
	if (record.pid === undefined || record.endedAt) {
		return false;
	}
	return killPid(record.pid);
};

export const prepare = async (
	spec: Pick<LaunchSpec, "settings">,
	l: Pick<Launch, "files" | "cwd">,
): Promise<void> => {
	await Promise.all([
		mkdir(l.files.config, { recursive: true }),
		mkdir(l.cwd, { recursive: true }),
	]);
	await Bun.write(
		l.files.settings,
		JSON.stringify(spec.settings ?? {}, null, "\t"),
	);
};

export const startRecord = async (
	spec: LaunchSpec,
	run: Run,
	l: Pick<Launch, "argv" | "env">,
): Promise<RunRecord> => ({
	probe: run.probe,
	runId: run.id,
	...(spec.arm ? { arm: spec.arm } : {}),
	...(spec.case ? { case: spec.case } : {}),
	argv: l.argv,
	envNames: Object.keys(l.env).sort((a, b) => a.localeCompare(b)),
	claudeVersion: await claudeVersion(l.env),
	pluginTreeHashes: spec.pluginTreeHashes ?? {},
	model: spec.model,
	settings: spec.settings ?? {},
	startedAt: new Date().toISOString(),
});

export const killPid = (pid: number): boolean => {
	try {
		process.kill(pid, "SIGTERM");
	} catch {
		return false;
	}
	setTimeout(() => {
		try {
			process.kill(pid, "SIGKILL");
		} catch {
			// already gone
		}
	}, KILL_GRACE_MS).unref();
	return true;
};

interface UserConfigEntry {
	type?: string;
	options?: unknown[];
	min?: number;
	max?: number;
}

interface Manifest {
	name: string;
	userConfig?: Record<string, UserConfigEntry>;
}

const readManifest = async (dir: string): Promise<Manifest> =>
	Bun.file(join(dir, ".claude-plugin", "plugin.json")).json();

const checkValue = (
	entry: UserConfigEntry | undefined,
	value: unknown,
): string | undefined => {
	if (!entry) {
		return "undeclared";
	}
	if (entry.type && typeof value !== entry.type) {
		return `want ${entry.type}, got ${JSON.stringify(value)}`;
	}
	if (entry.options && !entry.options.includes(value)) {
		return `want one of ${entry.options.join("|")}, got ${JSON.stringify(value)}`;
	}
	if (
		typeof value === "number" &&
		entry.min !== undefined &&
		value < entry.min
	) {
		return `want >= ${entry.min}, got ${value}`;
	}
	if (
		typeof value === "number" &&
		entry.max !== undefined &&
		value > entry.max
	) {
		return `want <= ${entry.max}, got ${value}`;
	}
	return undefined;
};
