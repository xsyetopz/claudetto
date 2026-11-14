import { expect, test } from "bun:test";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { ASK_TEXT } from "../../plugins/claudetto/hooks/texts.ts";
import { isRecord } from "../../plugins/claudetto/hooks/tools.ts";
import { claudeTty } from "./claude-run.ts";

const ASK = {
	tool: "AskUserQuestion",
	input: {
		questions: [
			{
				question: "Which file moves first?",
				header: "Order",
				multiSelect: false,
				options: [
					{ label: "`alpha.ts`", description: "The parser." },
					{ label: "`beta.ts`", description: "The printer." },
				],
			},
		],
	},
};

const lastOf = (requests: readonly Record<string, unknown>[]) =>
	requests.at(-1) ?? {};

const askToolOf = (request: Record<string, unknown>) =>
	(Array.isArray(request["tools"]) ? request["tools"] : [])
		.filter((t) => isRecord(t))
		.find((t) => t["name"] === "AskUserQuestion");

test("an interactive session shows the plugin's question, and the chosen option reaches the model", async () => {
	const cwd = await mkdtemp(join(tmpdir(), "claude-tty-"));
	const tty = await claudeTty({
		cwd,
		prompt: "go",
		// An interactive session defers the ask tool, so the model loads it by a search first.
		script: [
			{
				tool: "ToolSearch",
				input: { query: "select:AskUserQuestion", max_results: 1 },
			},
			ASK,
			{ text: "TTY-DONE" },
		],
	});

	await tty.waitFor("Which file moves first?");
	await tty.waitFor("beta.ts");
	tty.type("\r");
	await tty.waitFor("TTY-DONE");
	const requests = await tty.end();
	const last = lastOf(requests);

	expect(askToolOf(last)?.["description"]).toBe(ASK_TEXT);
	expect(JSON.stringify(last["messages"])).toContain("alpha.ts");
}, 60_000);
