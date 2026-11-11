import type { EngineInterface } from "claude-code";

import { redactWith, secretsIn } from "../secrets.ts";
import { fieldOf } from "./verdict.ts";

// Under HOME, not the project: a file in the project shows in its `git status`, and agents stop to explain or commit it.
// One file per session, since `$.fs` has no append and sessions that run at once would overwrite each other's lines.
export const GATE_LOG = ".claude/claudetto/gate-asks";
const LOGGED_CHARS = 200;

// `$.fs` has no append, so each line is read back and written whole; the queue keeps parallel checks from losing one.
let logging: Promise<void> = Promise.resolve();

/** Appends the call and its verdict to this session's log, unless the verdict is an allow. */
export async function log(
	$: EngineInterface,
	e: { tool: string; input: unknown },
	verdict: { decision: string; rule?: string; reason?: string },
): Promise<void> {
	if (verdict.decision === "allow") {
		return;
	}
	const before = logging;
	const write = async () => {
		await before;
		const path = `${await $.env.get("HOME")}/${GATE_LOG}/${await $.session.id()}.jsonl`;
		const text = [
			fieldOf(e.input, "command") ?? JSON.stringify(e.input) ?? "",
			verdict.rule ?? verdict.reason ?? "",
		].join("\0");
		const secrets = await secretsIn(
			(argv, init) => $.process.run(argv, init),
			text,
		);
		const [command = "", rule = ""] = redactWith(text, secrets)
			.split("\0")
			.map((part) => part.slice(0, LOGGED_CHARS));
		const line = JSON.stringify({
			time: new Date(await $.clock.now()).toISOString(),
			tool: e.tool,
			decision: verdict.decision,
			root: await $.session.root(),
			rule,
			command,
		});
		const held = (await $.fs.exists(path)) ? await $.fs.read(path) : "";
		await $.fs.write(path, `${held}${line}\n`);
	};
	// A failed write loses its line and keeps the verdict: the outer catch would turn a deny into an ask.
	logging = (async () => {
		try {
			await write();
		} catch (error) {
			$.ui.log(`The gate log line was not written (${String(error)})`);
		}
	})();
	await logging;
}
