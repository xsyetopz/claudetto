import type { On, SessionCompactTrigger, SessionMessage } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";
import { HANDOFF_DIR, readMessages } from "../../src/blocks/handoff/handoff.ts";
import { sourceLine } from "../../src/blocks/handoff/read-back.ts";
import { answered, type Line, logInto, said, used } from "./transcript.ts";

const TRANSCRIPT = "/tmp/transcript.jsonl";

const NAME = /^handoff-\d{4}-\d\d-\d\dT\d\d-\d\d-\d\d\.md$/;

const WITH_WORK: readonly SessionMessage[] = [
	said("user", "Rename `fetchUser` to `getUser`."),
	used("Renaming it.", "Edit", { file_path: "src/api.ts" }),
];

const sink = (on: On): readonly { path: string; text: string }[] => {
	const files: { path: string; text: string }[] = [];
	on("session.root", () => ({ value: "/repo" }));
	on("fs.write", (_$, e) => {
		files.push({ path: e.path, text: e.text });
		return { value: undefined };
	});
	on("ui.log", () => ({ value: undefined }));
	on("classic.SessionEnd", () => ({}));
	on("session.compact", () => ({ skip: "core ran" }));
	return files;
};

const compact = (
	$: Engine,
	messages: readonly SessionMessage[],
	trigger: SessionCompactTrigger = "auto",
	agentId?: string,
) =>
	$.session.compact({
		trigger,
		messages: [...messages],
		...(agentId === undefined ? {} : { agentId }),
	});

// The event carries the path resolved against the working directory, so the folder matches inside it.
const handoffs = (
	files: readonly { path: string; text: string }[],
): readonly { path: string; text: string }[] =>
	files.filter((file) =>
		file.path.replaceAll("\\", "/").includes(`/${HANDOFF_DIR}/`),
	);

const writtenOn = async (
	$: Engine,
	on: On,
	messages: readonly SessionMessage[],
) => {
	const files = sink(on);
	await compact($, messages);
	return handoffs(files);
};

test("a typed clear leaves no handoff file", async ($: Engine, on: On) => {
	const files = sink(on);

	await $.classic.SessionEnd({ reason: "clear", transcript_path: TRANSCRIPT });

	expect(handoffs(files)).toHaveLength(0);
});

test("a session that ends for another reason leaves none", async ($: Engine, on: On) => {
	const files = sink(on);

	await $.classic.SessionEnd({ reason: "logout", transcript_path: TRANSCRIPT });

	expect(handoffs(files)).toHaveLength(0);
});

test("a compaction leaves one handoff file", async ($: Engine, on: On) => {
	expect(await writtenOn($, on, WITH_WORK)).toHaveLength(1);
});

test("a `/compact` leaves one handoff file", async ($: Engine, on: On) => {
	const files = sink(on);

	await compact($, WITH_WORK, "manual");

	expect(handoffs(files)).toHaveLength(1);
});

test("a `precompute` installs nothing, so it leaves no handoff file", async ($: Engine, on: On) => {
	const files = sink(on);

	await compact($, WITH_WORK, "precompute");

	expect(handoffs(files)).toHaveLength(0);
});

test("a subagent's compaction leaves no handoff file, since the main conversation goes on", async ($: Engine, on: On) => {
	const files = sink(on);

	await compact($, WITH_WORK, "auto", "agent-1");

	expect(handoffs(files)).toHaveLength(0);
});

test("a session with no user turn leaves no file and no error", async ($: Engine, on: On) => {
	expect(
		await writtenOn($, on, [said("assistant", "Nothing was asked.")]),
	).toHaveLength(0);
});

const told = (on: On): readonly Line[] => {
	const lines: Line[] = [];
	logInto(on, lines);
	on("session.compact", () => ({ skip: "core ran" }));
	return lines;
};

// Failures go to the `transcript` sink: it shows a dim row, while `debug` shows nothing.
test("a write that fails tells the user in one line", async ($: Engine, on: On) => {
	on("fs.write", () => {
		throw new Error("EACCES: permission denied");
	});
	const lines = told(on);

	await compact($, WITH_WORK);

	expect(lines).toHaveLength(1);
	expect(lines[0]?.to).toBe("transcript");
	// The line names the file as well as the cause, because the file is what the user would look for.
	expect(lines[0]?.text).toContain(HANDOFF_DIR);
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
	const written = await writtenOn($, on, [
		said("user", "Write the handoff."),
		used("", "Write", {
			file_path: `${HANDOFF_DIR}/handoff-2026-10-29T08-00-00.md`,
		}),
	]);

	expect(written).toHaveLength(0);
});

test("reading an old handoff is not writing one, so the fallback still runs", async ($: Engine, on: On) => {
	const written = await writtenOn($, on, [
		said("user", "Go on with the work."),
		used("", "Read", {
			file_path: `${HANDOFF_DIR}/handoff-2026-10-29T08-00-00.md`,
		}),
	]);

	expect(written).toHaveLength(1);
});

// A drifted marker would give both files the same line, so feed `sourceLine` the writer's own output.
test("the read-back line tells a code-built handoff from one Claude wrote", async ($: Engine, on: On) => {
	const written = `# Handoff

## Goal

Ship the writer.
`;
	const files = await writtenOn($, on, WITH_WORK);

	expect(sourceLine(files[0]?.text ?? "")).not.toBe(sourceLine(written));
});

const PLAN_PATH = "docs/plans/rename-fetch-user.md";

const PLAN_READ = "Step 1: rename `fetchUser`. Step 2: update every caller.";

const PLAN_GREP = "docs/plans/rename-fetch-user.md:7: Step 3: delete the shim.";

const FROM_PLAN: readonly SessionMessage[] = [
	said("user", "Work from the plan."),
	used("Reading the plan.", "Read", { file_path: PLAN_PATH }),
	answered({ tool_use_id: "toolu_Read", text: PLAN_READ, isError: false }),
	answered({ tool_use_id: "toolu_Grep", text: PLAN_GREP, isError: false }),
];

test("a session that worked from a plan gets its path and not its text", async ($: Engine, on: On) => {
	const written = await writtenOn($, on, FROM_PLAN);

	const text = written[0]?.text ?? "";
	expect(text).toContain(PLAN_PATH);
	expect(text).not.toContain(PLAN_READ);
	expect(text).not.toContain("delete the shim");
});

test("a tool call with no file path adds no path", () => {
	const { paths } = readMessages([
		said("user", "Run the tests."),
		used("", "Bash", { command: "just check" }),
	]);

	expect(paths).toEqual([]);
});
