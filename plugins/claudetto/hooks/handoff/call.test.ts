import { expect, test } from "claude-code/testing";
import { type CallState, handOff, type Session } from "./call.ts";

const HANDOFF_PATH =
	/^\.claude\/claudetto\/handoffs\/handoff-\d{4}-\d\d-\d\dT\d\d-\d\d-\d\d\.md$/;

const FIELDS = {
	goal: "ship the cut",
	standing: "never restore the deletions",
	state: "done: parser",
	decisions: "table over regex",
	next_prompt: "run the suite",
};

const KEY = `sk-ant-api03-${"A".repeat(90)}`;

/** `later` queues the work so a test runs it where the timer would. */
const fake = (over: Partial<Session> = {}) => {
	const calls: string[] = [];
	const files: { path: string; text: string }[] = [];
	const queued: (() => Promise<void>)[] = [];
	const session: Session = {
		redact: (text) => Promise.resolve(text.replaceAll(KEY, "[REDACTED]")),
		write: (path, text) => {
			files.push({ path, text });
			return Promise.resolve();
		},
		clear: () => {
			calls.push("clear");
			return Promise.resolve();
		},
		setGoal: (condition) => {
			calls.push(`goal:${condition}`);
			return Promise.resolve();
		},
		submit: (text) => {
			calls.push(`submit:${text}`);
			return Promise.resolve();
		},
		taken: (name) => {
			calls.push(`taken:${name}`);
			return Promise.resolve();
		},
		abort: (turnId) => {
			calls.push(`abort:${turnId}`);
			return Promise.resolve();
		},
		log: (line) => calls.push(`log:${line}`),
		later: (work) => queued.push(work),
		gitStatus: () => Promise.resolve("## main...origin/main [ahead 3]"),
		...over,
	};
	return { session, calls, files, queued };
};

const idle = (goal?: string): CallState => ({
	handingOff: false,
	turn: "t1",
	goal,
});

test("the tool writes the file with its fields under the nine headings and no other", async () => {
	const { session, files } = fake();

	await handOff(session, idle(), FIELDS);

	const text = files[0]?.text ?? "";
	const headings = text.split("\n").filter((line) => line.startsWith("## "));
	expect(headings).toEqual([
		"## Goal",
		"## Standing Instructions",
		"## Decisions Log",
		"## Current State",
		"## In Progress",
		"## Next Steps",
		"## Key Files And Symbols",
		"## Gotchas And Dead Ends",
		"## Open Questions",
	]);
	expect(text).toContain("ship the cut");
	expect(text).toContain("table over regex");
	expect(files[0]?.path).toMatch(HANDOFF_PATH);
});

test("Git State Is Dated: the tool's handoff states the git status line as of its write time", async () => {
	const { session, files } = fake();

	await handOff(session, idle(), FIELDS);

	const text = files[0]?.text ?? "";
	const at = /Written by Claude at (\S+)\./.exec(text)?.[1];
	expect(at).toBeDefined();
	expect(text.split("## Current State")[1]?.split("## In Progress")[0]).toContain(
		`Git as of ${at}: \`## main...origin/main [ahead 3]\``,
	);
});

test("a call without a required field writes nothing and names the field", async () => {
	const { session, files, queued } = fake();

	const result = await handOff(session, idle(), { ...FIELDS, state: " " });

	expect(files).toEqual([]);
	expect(queued).toEqual([]);
	expect(result).toContain("state");
});

test("a key in a field is redacted in the file and in the next prompt", async () => {
	const { session, files, queued, calls } = fake();

	await handOff(session, idle(), { ...FIELDS, next_prompt: `use ${KEY}` });
	await queued[0]?.();

	expect(files[0]?.text).not.toContain(KEY);
	expect(calls.join("\n")).not.toContain(KEY);
});

test("the turn ends with no further request, and the clear and the submit wait for the idle", async () => {
	const { session, calls, queued } = fake();

	await handOff(session, idle(), FIELDS);

	expect(calls).toEqual(["abort:t1"]);
	expect(queued).toHaveLength(1);
	await queued[0]?.();
	expect(calls.slice(1, 4).map((call) => call.split(":")[0])).toEqual([
		"clear",
		"taken",
		"submit",
	]);
});

test("a second call while one runs runs no second clear and no second submit", async () => {
	const { session, queued } = fake();
	const state = idle();

	await handOff(session, state, FIELDS);
	const second = await handOff(session, state, FIELDS);

	expect(second).toContain("already in progress");
	expect(queued).toHaveLength(1);
});

test("the tool can hand off again after the first clear", async () => {
	const { session, queued } = fake();
	const state = idle();

	await handOff(session, state, FIELDS);
	await queued[0]?.();
	await handOff(session, state, FIELDS);

	expect(queued).toHaveLength(2);
});

test("a failed clear submits nothing and says so", async () => {
	const { session, calls, queued } = fake({
		clear: () => Promise.reject(new Error("busy")),
	});

	await handOff(session, idle(), FIELDS);
	await queued[0]?.();

	expect(calls.some((call) => call.startsWith("submit:"))).toBe(false);
	expect(calls.some((call) => call.includes("the clear failed"))).toBe(true);
});

test("a submit the session refuses tells the user in one line", async () => {
	const { session, calls, queued } = fake({
		submit: () => Promise.reject(new Error("refused")),
	});

	await handOff(session, idle(), FIELDS);
	await queued[0]?.();

	expect(calls.filter((call) => call.includes("was not sent"))).toHaveLength(1);
});

test("a write that fails comes back as the result and clears nothing", async () => {
	const { session, queued } = fake({
		write: () => Promise.reject(new Error("disk full")),
	});

	const result = await handOff(session, idle(), FIELDS);

	expect(result).toContain("could not be saved");
	expect(queued).toEqual([]);
});

test("an active goal is set again after the clear and before the submit", async () => {
	const { session, calls, queued } = fake();

	await handOff(session, idle("all tests pass"), FIELDS);
	await queued[0]?.();

	expect(calls.slice(1).map((call) => call.split(":")[0])).toEqual([
		"clear",
		"taken",
		"goal",
		"submit",
	]);
	expect(calls).toContain("goal:all tests pass");
});

test("no goal is set after a clear when none was active", async () => {
	const { session, calls, queued } = fake();

	await handOff(session, idle(), FIELDS);
	await queued[0]?.();

	expect(calls.filter((call) => call.startsWith("goal"))).toEqual([]);
});

test("a goal the engine refuses is named, and the handoff is still sent", async () => {
	const { session, calls, queued } = fake({
		setGoal: () => Promise.reject(new Error("hooks restricted")),
	});

	await handOff(session, idle("done"), FIELDS);
	await queued[0]?.();

	expect(calls.some((call) => call.startsWith("log:"))).toBe(true);
	expect(calls.some((call) => call.startsWith("submit:"))).toBe(true);
});
