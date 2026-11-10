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

/** `later` queues the work so a test runs it where the timer would. */
const fake = (over: Partial<Session> = {}) => {
	const calls: string[] = [];
	const files: { path: string; text: string }[] = [];
	const queued: (() => Promise<void>)[] = [];
	const session: Session = {
		write: (path, text) => {
			files.push({ path, text });
			return Promise.resolve();
		},
		clear: () => {
			calls.push("clear");
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
		...over,
	};
	return { session, calls, files, queued };
};

const idle = (): CallState => ({ handingOff: false, turn: "t1" });

test("the tool writes the file with its fields under the nine headings and no other", async () => {
	const { session, files } = fake();

	await handOff(session, idle(), FIELDS);

	const text = files[0]?.text ?? "";
	const headings = text.split("\n").filter((line) => line.startsWith("## "));
	expect(headings).toEqual([
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
	expect(text).toContain("ship the cut");
	expect(text).toContain("table over regex");
	expect(files[0]?.path).toMatch(HANDOFF_PATH);
});

test("a call without a required field writes nothing and names the field", async () => {
	const { session, files, queued } = fake();

	const result = await handOff(session, idle(), { ...FIELDS, state: " " });

	expect(files).toEqual([]);
	expect(queued).toEqual([]);
	expect(result).toContain("state");
});

test("a key in a field is redacted in the file and in the next prompt", async () => {
	const key = `sk-ant-api03-${"A".repeat(90)}`;
	const { session, files, queued, calls } = fake();

	await handOff(session, idle(), { ...FIELDS, next_prompt: `use ${key}` });
	await queued[0]?.();

	expect(files[0]?.text).not.toContain(key);
	expect(calls.join("\n")).not.toContain(key);
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
