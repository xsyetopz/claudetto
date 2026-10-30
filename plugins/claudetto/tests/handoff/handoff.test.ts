// `claude -p "/clear"` reports `other`, so the `clear` filter is held over the payload instead.

import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";
import { HANDOFF_DIR, parseTail } from "../../src/blocks/handoff/handoff.ts";
import { sourceLine } from "../../src/blocks/handoff/read-back.ts";

const TRANSCRIPT = "/tmp/transcript.jsonl";

const NAME = /^handoff-\d{4}-\d\d-\d\dT\d\d-\d\d-\d\d\.md$/;

const turn = (role: string, content: unknown): string =>
	JSON.stringify({ type: role, message: { role, content } });

const said = (role: string, text: string): string =>
	turn(role, [{ type: "text", text }]);

/** A tail begins inside a line, so every fixture carries a broken first line. */
const tailOf = (...lines: readonly string[]): string =>
	[`e":"text"}]}}`, ...lines].join("\n");

const WITH_WORK = tailOf(
	said("user", "Rename `fetchUser` to `getUser`."),
	turn("assistant", [
		{ type: "text", text: "Renaming it." },
		{ type: "tool_use", name: "Edit", input: { file_path: "src/api.ts" } },
	]),
);

const ran = (stdout: string, exitCode = 0) => ({
	value: {
		exitCode,
		stdout,
		stderr: "",
		isStdoutTruncated: false,
		isStderrTruncated: false,
	},
});

const sink = (on: On): readonly { path: string; text: string }[] => {
	const files: { path: string; text: string }[] = [];
	on("fs.write", (_$, e) => {
		files.push({ path: e.path, text: e.text });
		return { value: undefined };
	});
	on("ui.log", () => ({ value: undefined }));
	on("classic.SessionEnd", () => ({}));
	return files;
};

const lab = (
	on: On,
	stdout: string,
): readonly { path: string; text: string }[] => {
	on("process.run", () => ran(stdout));
	on("classic.PreCompact", () => ({}));
	return sink(on);
};

const clear = ($: Engine) =>
	$.classic.SessionEnd({ reason: "clear", transcript_path: TRANSCRIPT });

// The event carries the path resolved against the working directory, so the folder matches inside it.
const handoffs = (
	files: readonly { path: string; text: string }[],
): readonly { path: string; text: string }[] =>
	files.filter((file) =>
		file.path.replaceAll("\\", "/").includes(`/${HANDOFF_DIR}/`),
	);

const writtenOn = async ($: Engine, on: On, stdout: string) => {
	const files = lab(on, stdout);
	await clear($);
	return handoffs(files);
};

test("a typed clear leaves one handoff file", async ($: Engine, on: On) => {
	const files = lab(on, WITH_WORK);

	await $.classic.SessionEnd({ reason: "clear", transcript_path: TRANSCRIPT });

	expect(handoffs(files)).toHaveLength(1);
});

test("a session that ends for another reason leaves none", async ($: Engine, on: On) => {
	const files = lab(on, WITH_WORK);

	await $.classic.SessionEnd({ reason: "logout", transcript_path: TRANSCRIPT });

	expect(handoffs(files)).toHaveLength(0);
});

test("a compaction leaves one handoff file", async ($: Engine, on: On) => {
	const files = lab(on, WITH_WORK);

	await $.classic.PreCompact({
		trigger: "auto",
		custom_instructions: null,
		transcript_path: TRANSCRIPT,
	});

	expect(handoffs(files)).toHaveLength(1);
});

test("a session with no user turn leaves no file and no error", async ($: Engine, on: On) => {
	const files = lab(on, tailOf(said("assistant", "Nothing was asked.")));

	await $.classic.SessionEnd({ reason: "clear", transcript_path: TRANSCRIPT });

	expect(handoffs(files)).toHaveLength(0);
});

test("a transcript that cannot be read leaves no file and no error", async ($: Engine, on: On) => {
	on("process.run", () => {
		throw new Error("tail: no such file");
	});
	const files = sink(on);

	await $.classic.SessionEnd({ reason: "clear", transcript_path: TRANSCRIPT });

	expect(handoffs(files)).toHaveLength(0);
});

test("a failing tail leaves no file and no error", async ($: Engine, on: On) => {
	on("process.run", () => ran("", 1));
	const files = sink(on);

	await $.classic.SessionEnd({ reason: "clear", transcript_path: TRANSCRIPT });

	expect(handoffs(files)).toHaveLength(0);
});

const told = (on: On): readonly { text: string; to: string }[] => {
	const lines: { text: string; to: string }[] = [];
	on("ui.log", (_$, e) => {
		lines.push({ text: e.text, to: e.to });
		return { value: undefined };
	});
	on("classic.SessionEnd", () => ({}));
	return lines;
};

const cleared = async ($: Engine, on: On) => {
	const lines = told(on);
	await clear($);
	return lines;
};

// Failures go to the `transcript` sink: it shows a dim row, while `debug` shows nothing.
test("a transcript that cannot be read tells the user in one line", async ($: Engine, on: On) => {
	on("process.run", () => {
		throw new Error("tail: no such file");
	});
	on("fs.write", () => ({ value: undefined }));
	const lines = await cleared($, on);

	expect(lines).toHaveLength(1);
	expect(lines[0]?.to).toBe("transcript");
});

test("a tail that exits non-zero tells the user in one line", async ($: Engine, on: On) => {
	on("process.run", () => ran("", 1));
	on("fs.write", () => ({ value: undefined }));
	const lines = await cleared($, on);

	expect(lines).toHaveLength(1);
	expect(lines[0]?.to).toBe("transcript");
});

test("a write that fails tells the user in one line", async ($: Engine, on: On) => {
	on("process.run", () => ran(WITH_WORK));
	on("fs.write", () => {
		throw new Error("EACCES: permission denied");
	});
	const lines = await cleared($, on);

	expect(lines).toHaveLength(1);
	expect(lines[0]?.to).toBe("transcript");
	// The line names the file as well as the cause, because the file is what the user would look for.
	expect(lines[0]?.text).toContain(HANDOFF_DIR);
});

test("the read is bounded by bytes, whatever the transcript's size", async ($: Engine, on: On) => {
	const argv: string[][] = [];
	on("process.run", (_$, e) => {
		argv.push([...e.argv]);
		return ran(WITH_WORK);
	});
	sink(on);

	await clear($);

	expect(argv).toEqual([["tail", "-c", "262144", TRANSCRIPT]]);
});

// A test engine reports `Infinity` for `next.budget.remainingMs`, so the read is checked against the cut.
test("the read on a clear is bounded by the cut SessionEnd enforces", async ($: Engine, on: On) => {
	const bounds: (number | undefined)[] = [];
	on("process.run", (_$, e) => {
		bounds.push(e.init?.timeoutMs);
		return ran(WITH_WORK);
	});
	sink(on);

	await clear($);

	expect(bounds).toEqual([1100]);
});

test("the handoff names the files the session touched", async ($: Engine, on: On) => {
	const written = await writtenOn($, on, WITH_WORK);

	expect(written[0]?.text).toContain("src/api.ts");
});

test("the handoff carries the user's ask", async ($: Engine, on: On) => {
	const written = await writtenOn($, on, WITH_WORK);

	expect(written[0]?.text).toContain("Rename `fetchUser` to `getUser`.");
});

test("the file is named handoff- and a UTC stamp", async ($: Engine, on: On) => {
	const written = await writtenOn($, on, WITH_WORK);

	const name = written[0]?.path.split("/").at(-1) ?? "";
	expect(name).toMatch(NAME);
});

test("a file Claude wrote is kept and no code-built one goes beside it", async ($: Engine, on: On) => {
	const files = lab(
		on,
		tailOf(
			said("user", "Write the handoff."),
			turn("assistant", [
				{
					type: "tool_use",
					name: "Write",
					input: { file_path: `${HANDOFF_DIR}/handoff-2026-10-29T08-00-00.md` },
				},
			]),
		),
	);

	await $.classic.SessionEnd({ reason: "clear", transcript_path: TRANSCRIPT });

	expect(handoffs(files)).toHaveLength(0);
});

test("reading an old handoff is not writing one, so the fallback still runs", async ($: Engine, on: On) => {
	const files = lab(
		on,
		tailOf(
			said("user", "Go on with the work."),
			turn("assistant", [
				{
					type: "tool_use",
					name: "Read",
					input: { file_path: `${HANDOFF_DIR}/handoff-2026-10-29T08-00-00.md` },
				},
			]),
		),
	);

	await $.classic.SessionEnd({ reason: "clear", transcript_path: TRANSCRIPT });

	expect(handoffs(files)).toHaveLength(1);
});

// A drifted marker would give both files the same line, so feed `sourceLine` the writer's own output.
test("the read-back line tells a code-built handoff from one Claude wrote", async ($: Engine, on: On) => {
	const written = `# Handoff

## Goal

Ship the writer.
`;
	const files = lab(on, WITH_WORK);

	await $.classic.SessionEnd({ reason: "clear", transcript_path: TRANSCRIPT });

	expect(sourceLine(handoffs(files)[0]?.text ?? "")).not.toBe(
		sourceLine(written),
	);
});

// Tool results come as `{type:"text"}` parts (`Read`) or a plain string (commands); only the path is kept.
const PLAN_PATH = "docs/plans/rename-fetch-user.md";

const PLAN_READ = "Step 1: rename `fetchUser`. Step 2: update every caller.";

const PLAN_GREP = "docs/plans/rename-fetch-user.md:7: Step 3: delete the shim.";

const FROM_PLAN = tailOf(
	said("user", "Work from the plan."),
	turn("assistant", [
		{ type: "text", text: "Reading the plan." },
		{ type: "tool_use", name: "Read", input: { file_path: PLAN_PATH } },
	]),
	turn("user", [
		{
			tool_use_id: "toolu_01",
			type: "tool_result",
			content: [{ type: "text", text: PLAN_READ }],
		},
	]),
	turn("user", [
		{ tool_use_id: "toolu_02", type: "tool_result", content: PLAN_GREP },
	]),
);

test("a session that worked from a plan gets its path and not its text", async ($: Engine, on: On) => {
	const files = lab(on, FROM_PLAN);

	await $.classic.SessionEnd({ reason: "clear", transcript_path: TRANSCRIPT });

	const text = handoffs(files)[0]?.text ?? "";
	expect(text).toContain(PLAN_PATH);
	expect(text).not.toContain(PLAN_READ);
	expect(text).not.toContain("delete the shim");
});

test("a broken first line of the tail is dropped, not parsed", () => {
	const tail = tailOf(said("user", "Keep this one."));

	const { turns } = parseTail(tail);

	expect(turns).toEqual([{ role: "user", text: "Keep this one." }]);
});

test("a tool call with no file path adds no path", () => {
	const tail = tailOf(
		said("user", "Run the tests."),
		turn("assistant", [
			{ type: "tool_use", name: "Bash", input: { command: "just check" } },
		]),
	);

	const { paths } = parseTail(tail);

	expect(paths).toEqual([]);
});
