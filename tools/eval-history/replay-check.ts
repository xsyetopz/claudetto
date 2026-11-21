/**
 * Checks, without a paid call, that Claude Code loads a generated history: it resumes the file
 * against the local fake API and reports what the first model request carries.
 *
 * Run: `bun tools/eval-history/replay-check.ts <history.jsonl> "<prompt>"`.
 */
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { startFakeApi } from "../measure-tools/fake-api";

const [history, prompt] = Bun.argv.slice(2);
if (history === undefined || prompt === undefined) {
	throw new Error("usage: replay-check.ts <history.jsonl> <prompt>");
}

const config = await mkdtemp(join(tmpdir(), "replay-check-"));
const api = startFakeApi(false);
try {
	const proc = Bun.spawn(
		[
			"claude",
			"-p",
			prompt,
			"--resume",
			resolve(history),
			"--output-format",
			"text"
		],
		{
			cwd: config,
			stdout: "pipe",
			stderr: "pipe",
			env: {
				...process.env,
				CLAUDE_CONFIG_DIR: config,
				ANTHROPIC_BASE_URL: api.url,
				ANTHROPIC_API_KEY: "sk-ant-fake",
				DISABLE_TELEMETRY: "1"
			}
		}
	);
	const [out, err, code] = await Promise.all([
		new Response(proc.stdout).text(),
		new Response(proc.stderr).text(),
		proc.exited
	]);
	console.info(
		`exit ${code}; stdout: ${out.trim()}; stderr: ${err.trim().slice(0, 300)}`
	);
	const main = api.requests.filter(
		(r) => Array.isArray(r.body["tools"]) && r.body["tools"].length > 0
	);
	console.info(`requests: ${api.requests.length}, with tools: ${main.length}`);
	const messages = main.at(-1)?.body["messages"];
	if (Array.isArray(messages)) {
		console.info(`messages in the last request: ${messages.length}`);
		console.info(
			`request body bytes: ${JSON.stringify(main.at(-1)?.body).length}`
		);
		for (const m of messages.slice(-4)) {
			console.info(JSON.stringify(m).slice(0, 260));
		}
	}
} finally {
	await api.stop();
	await rm(config, { recursive: true, force: true });
}
