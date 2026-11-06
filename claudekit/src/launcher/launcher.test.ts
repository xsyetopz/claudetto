import { describe, expect, test } from "bun:test";
import { chmod, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { mainRequests, readRequests, startFake } from "../fake/fake.ts";
import { DEFAULT_MODEL } from "../shared/model.ts";
import { tempDir } from "../shared/temp.ts";
import { createRun, readRecord } from "../workspace/workspace.ts";
import { buildLaunch, checkOptions, launch, stop } from "./launcher.ts";

const LAUNCHER = join(import.meta.dir, "launcher.ts");
const WORKSPACE = join(import.meta.dir, "..", "workspace", "workspace.ts");
const VERSION = /^\d+\.\d+\.\d+$/;
const EXPECTS_NUMBER = /want number/;

const root = (): Promise<string> => tempDir("launch");
const text = (blocks: string) => ({
	reply: { blocks: [{ type: "text" as const, text: blocks }] },
});

const pluginDir = async (): Promise<string> => {
	const dir = await tempDir("plugin");
	await mkdir(join(dir, ".claude-plugin"));
	await Bun.write(
		join(dir, ".claude-plugin", "plugin.json"),
		JSON.stringify({
			name: "demo",
			userConfig: {
				handoverTokens: { type: "number", min: 1000 },
				mode: { type: "string", options: ["off", "on"] },
				enabled: { type: "boolean" },
			},
		}),
	);
	return dir;
};

describe("buildLaunch", () => {
	test("isolates the env and passes a token by name only", async () => {
		const run = await createRun({
			probe: "unit",
			root: await root(),
			quiet: true,
		});
		const parent = {
			HOME: "/h",
			PATH: "/p",
			SECRET_TOKEN: "s3cr3t",
			OTHER: "x",
		};
		const l = buildLaunch(
			{ prompt: "hi", mode: "json", model: DEFAULT_MODEL, passEnv: ["SECRET_TOKEN"] },
			run,
			parent,
		);
		expect(l.env.OTHER).toBeUndefined();
		expect(l.env.SECRET_TOKEN).toBe("s3cr3t");
		expect(l.env.CLAUDE_CONFIG_DIR).toBe(join(run.dir, "config"));
		expect(l.argv).toContain("--verbose");
		expect(l.argv).toContain("--no-session-persistence");
		expect(l.argv.slice(-2)).toEqual(["--", "hi"]);
	});

	test("persist drops --no-session-persistence, so the run writes a transcript a hook can read", async () => {
		const run = await createRun({ probe: "unit", root: await root(), quiet: true });
		const spec = { prompt: "hi", mode: "json" as const, model: DEFAULT_MODEL };
		expect(buildLaunch({ ...spec, persist: true }, run, {}).argv).not.toContain("--no-session-persistence");
		expect(buildLaunch(spec, run, {}).argv).toContain("--no-session-persistence");
	});

	test("the login keeps the default config folder and USER, and sends no fake key", async () => {
		const run = await createRun({ probe: "unit", root: await root(), quiet: true });
		const parent = { HOME: "/h", PATH: "/p", USER: "u" };
		const spec = { prompt: "hi", mode: "json" as const, model: DEFAULT_MODEL, baseUrl: "http://127.0.0.1:1" };
		const login = buildLaunch({ ...spec, auth: "login" }, run, parent).env;
		expect(login.CLAUDE_CONFIG_DIR).toBeUndefined();
		expect(login.USER).toBe("u");
		expect(login.ANTHROPIC_API_KEY).toBeUndefined();
		expect(login.ANTHROPIC_BASE_URL).toBe("http://127.0.0.1:1");
		const fake = buildLaunch(spec, run, parent).env;
		expect(fake.USER).toBeUndefined();
		expect(fake.ANTHROPIC_API_KEY).toBeDefined();
	});

	test("the login turns the account's claude.ai connectors off unless the arm sets the switch", async () => {
		const run = await createRun({ probe: "unit", root: await root(), quiet: true });
		const spec = { prompt: "hi", mode: "json" as const, model: DEFAULT_MODEL, auth: "login" as const };
		expect(buildLaunch(spec, run, {}).env.ENABLE_CLAUDEAI_MCP_SERVERS).toBe("false");
		expect(buildLaunch({ ...spec, env: { ENABLE_CLAUDEAI_MCP_SERVERS: "true" } }, run, {}).env.ENABLE_CLAUDEAI_MCP_SERVERS).toBe("true");
	});
});

describe("checkOptions", () => {
	test('refuses "16000" where a number belongs, and an unknown option', async () => {
		const dir = await pluginDir();
		const errors = await checkOptions({
			pluginDirs: [dir],
			settings: {
				pluginConfigs: {
					demo: {
						options: { handoverTokens: "16000", mode: "maybe", typo: 1 },
					},
				},
			},
		});
		expect(
			errors.map((e) => e.option).sort((a, b) => a.localeCompare(b)),
		).toEqual(["handoverTokens", "mode", "typo"]);
	});

	test("accepts well-typed options", async () => {
		const dir = await pluginDir();
		const errors = await checkOptions({
			pluginDirs: [dir],
			settings: {
				pluginConfigs: {
					"demo@inline": {
						options: { handoverTokens: 16_000, mode: "on", enabled: true },
					},
				},
			},
		});
		expect(errors).toEqual([]);
	});
});

describe("launch against the fake", () => {
	test("a caller blocked in spawnSync still gets answers, because the fake is its own process", async () => {
		const run = await createRun({
			probe: "unit",
			root: await root(),
			quiet: true,
		});
		const fake = await startFake({
			plan: { steps: [text("SYNC-OK.")] },
			dir: join(run.dir, "requests"),
		});
		try {
			const l = buildLaunch(
				{ prompt: "hi", mode: "json", model: DEFAULT_MODEL, baseUrl: fake.url },
				run,
			);
			await mkdir(l.files.config, { recursive: true });
			await mkdir(l.cwd, { recursive: true });
			await Bun.write(l.files.settings, "{}");
			const out = Bun.spawnSync(l.argv, {
				env: l.env,
				cwd: l.cwd,
				stdin: "ignore",
				timeout: 60_000,
			});
			expect(out.exitCode).toBe(0);
			expect(out.stdout.toString()).toContain("SYNC-OK.");
		} finally {
			await fake.stop();
		}
	});

	test("records argv, env names, version, pid, and exit code, and no env value", async () => {
		const run = await createRun({
			probe: "unit",
			root: await root(),
			quiet: true,
		});
		const fake = await startFake({
			plan: { steps: [text("REC.")] },
			dir: join(run.dir, "requests"),
		});
		try {
			await launch(
				{ prompt: "hi", mode: "json", model: DEFAULT_MODEL, baseUrl: fake.url },
				run,
			);
		} finally {
			await fake.stop();
		}
		const record = await readRecord(run.dir);
		expect(record.exitCode).toBe(0);
		expect(record.claudeVersion).toMatch(VERSION);
		expect(record.pid).toBeGreaterThan(0);
		expect(record.envNames).toContain("ANTHROPIC_API_KEY");
		expect(JSON.stringify(record)).not.toContain("sk-ant-fake");
	});

	test("refuses to launch with a mistyped option, before any request", async () => {
		const run = await createRun({
			probe: "unit",
			root: await root(),
			quiet: true,
		});
		const spec = {
			prompt: "hi",
			mode: "json" as const,
			model: DEFAULT_MODEL,
			pluginDirs: [await pluginDir()],
			settings: {
				pluginConfigs: { demo: { options: { handoverTokens: "16000" } } },
			},
		};
		await expect(launch(spec, run)).rejects.toThrow(EXPECTS_NUMBER);
	});

	test("stop kills the recorded pid, and a timeout ends a stuck run", async () => {
		const run = await createRun({
			probe: "unit",
			root: await root(),
			quiet: true,
		});
		const fake = await startFake({
			plan: { steps: [], fallback: { delayMs: 60_000 } },
			dir: join(run.dir, "requests"),
		});
		try {
			const pending = launch(
				{ prompt: "hi", mode: "json", model: DEFAULT_MODEL, baseUrl: fake.url },
				run,
			);
			await Bun.sleep(1500);
			expect(await stop(run)).toBe(true);
			const result = await pending;
			expect(result.exitCode).not.toBe(0);

			const run2 = await createRun({
				probe: "unit",
				root: await root(),
				quiet: true,
			});
			const timed = await launch(
				{
					prompt: "hi",
					mode: "json",
					model: DEFAULT_MODEL,
					baseUrl: fake.url,
					timeoutMs: 1500,
				},
				run2,
			);
			expect(timed.timedOut).toBe(true);
		} finally {
			await fake.stop();
		}
	});

	test("a launch with no baseUrl and mode json throws before spawning, naming the cap and stream-json", async () => {
		const run = await createRun({ probe: "unit", root: await root(), quiet: true });
		await expect(launch({ prompt: "hi", mode: "json", model: DEFAULT_MODEL }, run)).rejects.toThrow(
			/mode "json".*300000 token cap needs mode "stream-json"/,
		);
		expect(await Bun.file(join(run.dir, "run.json")).exists()).toBe(false);
		expect(await Bun.file(join(run.dir, "stdout.txt")).exists()).toBe(false);
	});

	test("a stream-json run is killed once its streamed usage passes the cap, and the record says so", async () => {
		const bin = await tempDir("fake-claude");
		await Bun.write(
			join(bin, "claude"),
			`#!/bin/sh
[ "$1" = "--version" ] && { echo "0.0.0 (fake)"; exit 0; }
for i in 1 2 3 4 5 6 7 8; do
  echo '{"type":"assistant","message":{"id":"msg_'$i'","usage":{"input_tokens":100000,"output_tokens":1}}}'
  sleep 0.5
done
echo '{"type":"result"}'
`,
		);
		await chmod(join(bin, "claude"), 0o755);
		const run = await createRun({ probe: "unit", root: await root(), quiet: true });
		const path = process.env.PATH;
		process.env.PATH = `${bin}:${path}`;
		try {
			const result = await launch({ prompt: "hi", mode: "stream-json", model: DEFAULT_MODEL }, run);
			expect(result.capped).toBe(true);
			expect(result.timedOut).toBe(false);
			expect(result.exitCode).not.toBe(0);
			const stdout = await Bun.file(result.files.stdout).text();
			expect(stdout).not.toContain('"type":"result"');
			expect(stdout.split("\n").filter((l) => l.includes("assistant")).length).toBe(3);
			const record = await readRecord(run.dir);
			expect(record.capped).toBe(true);
			expect(record.usage?.input_tokens).toBe(300_000);
		} finally {
			process.env.PATH = path;
		}
	});

	test("the parent's stdin never reaches the prompt", async () => {
		const run = await createRun({
			probe: "unit",
			root: await root(),
			quiet: true,
		});
		const fake = await startFake({
			plan: { steps: [text("NO-STDIN.")] },
			dir: join(run.dir, "requests"),
		});
		const script = `
			import { launch } from ${JSON.stringify(LAUNCHER)};
			const run = { id: ${JSON.stringify(run.id)}, dir: ${JSON.stringify(run.dir)}, probe: "unit" };
			await launch({ prompt: "hi", mode: "json", model: "${DEFAULT_MODEL}", baseUrl: ${JSON.stringify(fake.url)} }, run);
			void ${JSON.stringify(WORKSPACE)};`;
		try {
			const child = Bun.spawn(["bun", "-e", script], {
				stdin: new Blob(["LEAKED-STDIN-LINE\n"]),
				stdout: "ignore",
			});
			expect(await child.exited).toBe(0);
		} finally {
			await fake.stop();
		}
		const main = mainRequests(await readRequests(join(run.dir, "requests")));
		expect(main.length).toBe(1);
		expect(JSON.stringify(main[0]?.body)).not.toContain("LEAKED-STDIN-LINE");
	});
});
