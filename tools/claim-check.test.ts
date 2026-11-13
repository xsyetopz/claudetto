import { expect, test } from "bun:test";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { file, spawn } from "bun";

import { bundlePlugin } from "./claim-check-launch.ts";

// Seen in a paid run: the bundle wrote an exported arrow scorer as `var`, the engine refused to load the module, and the run scored nothing.
test("the bundled plugin loads in Claude Code", async () => {
	const out = await mkdtemp(join(tmpdir(), "claim-check-load-"));
	const debug = join(out, "debug.log");
	const proc = spawn(
		[
			"claude",
			"-p",
			"ok",
			"--max-turns",
			"1",
			"--no-session-persistence",
			"--setting-sources",
			"",
			"--tools",
			"",
			"--plugin-dir",
			await bundlePlugin(out),
			"--debug-file",
			debug,
		],
		{
			cwd: out,
			env: {
				...process.env,
				ANTHROPIC_BASE_URL: "http://127.0.0.1:9",
				CLAUDE_CODE_MAX_RETRIES: "0",
				ENABLE_CLAUDEAI_MCP_SERVERS: "false",
			},
			stdout: "ignore",
			stderr: "ignore",
		},
	);
	await proc.exited;

	expect(await file(debug).text()).not.toContain("did not load");
}, 60_000);
