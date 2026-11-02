import type { On } from "claude-code";
import { type Engine, expect, mock, test } from "claude-code/testing";
import { registeredTools } from "../../src/blocks/__tests__/lab-support.ts";
import { HANDOFF_DIR } from "../../src/blocks/handoff/handoff.ts";
import { said, tailOf } from "./transcript.ts";

const TOOL = "mcp__claudetto__handoff";

const ARGS = {
	goal: "Ship the export.",
	standing: "Keep `Intl` out of the export; quote every cell.",
	state: "Export works; `just check` passed.",
	decisions:
		"CSV over JSON, because the sheet reads it. Streaming broke the sheet.",
	next_prompt: "Wire the export into the menu.",
};

const GITHUB_TOKEN = `ghp_${"b".repeat(36)}`;

const FIRST_PROMPT = "Add a CSV export.";

interface Seen {
	readonly written: { path: string; text: string }[];
	readonly runs: string[];
	readonly sent: string[];
	readonly aborted: string[];
	readonly lines: string[];
}

const lab = (
	on: On,
	clearFails = false,
): { seen: Seen; clock: ReturnType<typeof mock.clock> } => {
	const seen: Seen = {
		written: [],
		runs: [],
		sent: [],
		aborted: [],
		lines: [],
	};
	const clock = mock.clock(on, { now: 0 });
	mock.store(on);
	on("session.root", () => ({ value: "/repo" }));
	on("fs.write", (_$, e) => {
		seen.written.push({ path: e.path, text: e.text });
		return { value: undefined };
	});
	on("ui.log", (_$, e) => {
		seen.lines.push(e.text);
		return { value: undefined };
	});
	on("command.run", (_$, e) => {
		if (clearFails) {
			throw new Error("clear refused");
		}
		seen.runs.push(e.command);
		return { text: "" };
	});
	on("prompt.submit", (_$, e) => {
		seen.sent.push(e.text);
		return { text: e.text };
	});
	on("turn.start", (_$, e) => ({ turnId: e.turnId }));
	on("turn.abort", (_$, e) => {
		seen.aborted.push(e.turnId);
		return { value: undefined };
	});
	return { seen, clock };
};

const call = async ($: Engine, args: object = ARGS): Promise<void> => {
	await $.turn.start({ text: "Hand off.", turnId: "t1" });
	await $.tool.call({ tool: TOOL, ...args });
};

test("`session.start` registers the `handoff` tool", async ($: Engine, on: On) => {
	const names = await registeredTools($, on);

	expect(names).toContain("handoff");
});

test("the tool writes the file with its fields", async ($: Engine, on: On) => {
	const { seen } = lab(on);

	await call($);

	expect(seen.written).toHaveLength(1);
	const [file] = seen.written;
	expect(file?.path).toContain(`${HANDOFF_DIR}/handoff-`);
	expect(file?.text.startsWith("# Handoff\n")).toBe(true);
	for (const part of Object.values(ARGS)) {
		expect(file?.text).toContain(part);
	}
});

test("a key in a field is redacted in the file and in the next prompt", async ($: Engine, on: On) => {
	const { seen, clock } = lab(on);

	await call($, { ...ARGS, state: `The token is ${GITHUB_TOKEN}.` });
	await clock.settle();

	expect(seen.written[0]?.text).toContain("[REDACTED]");
	expect(seen.written[0]?.text).not.toContain(GITHUB_TOKEN);
	expect(seen.sent.join("")).not.toContain(GITHUB_TOKEN);
});

test("a call without a required field writes nothing and names the field", async ($: Engine, on: On) => {
	const { seen } = lab(on);

	const out = await $.tool.call({ tool: TOOL, ...ARGS, goal: "" });

	expect(seen.written).toEqual([]);
	expect(JSON.stringify(out)).toContain("goal");
});

test("the file has the nine headings of the template and no other", async ($: Engine, on: On) => {
	const { seen } = lab(on);

	await call($);

	const heads = (seen.written[0]?.text ?? "")
		.split("\n")
		.filter((line) => line.startsWith("#"));
	expect(heads).toEqual([
		"# Handoff",
		"## Goal",
		"## Standing instructions",
		"## Decisions log",
		"## Current state",
		"## In progress",
		"## Next steps",
		"## Key files and symbols",
		"## Gotchas and dead ends",
		"## Open questions",
	]);
});

test("the turn ends with no further request, and the clear and the submit wait for the idle", async ($: Engine, on: On) => {
	const { seen, clock } = lab(on);

	await call($);

	expect(seen.aborted).toEqual(["t1"]);
	expect(seen.runs).toEqual([]);
	expect(seen.sent).toEqual([]);
	await clock.settle();
	expect(seen.runs).toEqual(["clear"]);
	expect(seen.sent).toHaveLength(1);
	expect(seen.sent[0]).toContain(ARGS.goal);
	expect(seen.sent[0]?.endsWith(ARGS.next_prompt)).toBe(true);
});

test("a second call of the tool runs no second clear and no second submit", async ($: Engine, on: On) => {
	const { seen, clock } = lab(on);

	await call($);
	await call($);
	await clock.settle();

	expect(seen.runs).toEqual(["clear"]);
	expect(seen.sent).toHaveLength(1);
});

test("the tool can hand off again after the first clear", async ($: Engine, on: On) => {
	const { seen, clock } = lab(on);

	await call($);
	await clock.settle();
	await call($);
	await clock.settle();

	expect(seen.runs).toEqual(["clear", "clear"]);
	expect(seen.sent).toHaveLength(2);
});

test("a failed clear submits nothing and says so", async ($: Engine, on: On) => {
	const { seen, clock } = lab(on, true);

	await call($);
	await clock.settle();

	expect(seen.sent).toEqual([]);
	expect(seen.lines.join("\n")).toContain("the clear failed");
});

test("a typed `/clear` writes no file and takes no handoff in", async ($: Engine, on: On) => {
	const { seen, clock } = lab(on);
	on("process.run", () => ({
		value: {
			exitCode: 0,
			stdout: tailOf(said("user", FIRST_PROMPT)),
			stderr: "",
			isStdoutTruncated: false,
			isStderrTruncated: false,
		},
	}));
	on("classic.SessionEnd", () => ({}));
	on("classic.SessionStart", () => ({}));
	on("fs.exists", () => ({ value: true }));
	on("fs.list", () => ({
		value: [
			{
				name: "handoff-2026-11-01T10-00-00.md",
				kind: "file" as const,
				size: 1,
				mtimeMs: 0,
				isLink: false,
			},
		],
	}));
	on("fs.read", () => ({ value: "# Handoff\n" }));

	await $.classic.SessionEnd({
		reason: "clear",
		transcript_path: "/tmp/transcript.jsonl",
	});
	await $.classic.SessionStart({ source: "clear" });
	await clock.settle();

	expect(seen.written).toEqual([]);
	expect(seen.sent).toEqual([]);
});
