// Who changed a file (spec `session-hygiene`, "Who Changed a File").

import { expect, test } from "bun:test";
import {
	isGitView,
	whoChanged,
} from "../../../../plugins/claudetto/modules/session/hygiene/domain/authors.ts";

const WORKFLOW = ".github/workflows/commitlint.yml";

/** The bullet of `who` in the context text, or undefined when the text has none. */
const entry = (text: string | null, who: string): string | undefined =>
	text?.split("\n").find((line) => line.startsWith(`- ${who}:`));

test("User Edit: a file that no ledger line holds with its hash is a change of the user", () => {
	const text = whoChanged(
		[{ path: WORKFLOW, hash: "1", session: "s1", agent: "main" }],
		"s1",
		[{ path: WORKFLOW, hash: "2" }],
	);
	expect(entry(text, "The user")).toContain(`\`${WORKFLOW}\``);
	expect(entry(text, "This session")).toBeUndefined();
});

test("Other Session: a file that session A wrote is a change of session A for session B", () => {
	const text = whoChanged(
		[{ path: "src/x.ts", hash: "1", session: "A", agent: "main" }],
		"B",
		[{ path: "src/x.ts", hash: "1" }],
	);
	expect(entry(text, "Another Claude session")).toContain("`src/x.ts`");
	expect(entry(text, "Another Claude session")).toContain("`A`");
	expect(entry(text, "The user")).toBeUndefined();
});

test("a file of this session is sorted as this session", () => {
	const text = whoChanged(
		[{ path: "a.ts", hash: "1", session: "s1", agent: "main" }],
		"s1",
		[{ path: "a.ts", hash: "1" }],
	);
	expect(entry(text, "This session")).toContain("`a.ts`");
});

test("a work tree with no changed file gives no context", () => {
	expect(whoChanged([], "s1", [])).toBeNull();
});

test("`isGitView` matches `git status` and `git diff`, also with options, wrappers, and pipes", () => {
	for (const command of [
		"git status",
		"git diff --stat",
		"git -C sub status --short",
		"git --no-pager diff HEAD",
		"cd x && git status | head",
		"/usr/bin/git diff",
	]) {
		expect(isGitView(command)).toBe(true);
	}
});

test("`isGitView` does not match other commands", () => {
	for (const command of [
		"git log",
		"git commit -m status",
		"echo git status",
		"ls",
	]) {
		expect(isGitView(command)).toBe(false);
	}
});
