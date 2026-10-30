// Hard Deny on Parsed Commands: a wrapped form gives the verdict of its plain form, and a command the reader cannot read asks.
// The forms are the ones measured in `openspec/changes/claudetto-restart/design.md` line 79 and 80.

import { describe, expect, test } from "bun:test";
import { bash } from "../../gate/__tests__/facts-stub.ts";
import { parse } from "../shell.ts";

const PUSH_REASON = "This push rewrites or deletes history on the remote.";

describe("Wrapped Push: each form of a force push asks for the same reason", () => {
	for (const command of [
		"git push --force",
		"git -C . push --force",
		"git -C /repo push --force",
		"env GIT_DIR=.git git push --force",
		"bash -c 'git push --force'",
		"sh -c 'git -C . push --force'",
		'eval "git push --force"',
		"git -c alias.yolo='push --force' yolo",
	]) {
		test(command, async () => {
			const v = await bash(command);

			expect([v.decision, v.reason]).toStrictEqual(["ask", PUSH_REASON]);
		});
	}
});

describe("Secret and root rules match through a wrapper", () => {
	for (const command of [
		"cat .env",
		"bash -c 'cat .env'",
		"cat ~/.ssh/id_rsa",
		"bash -c 'cat ~/.ssh/id_rsa'",
		"env X=$(cat .env) true",
		"rm -rf /",
		"sh -c 'rm -rf /'",
		"rm -rf ~",
		"bash -c 'rm -rf ~'",
	]) {
		test(command, async () => {
			const v = await bash(command);

			expect(v.decision).toBe("deny");
		});
	}
});

describe("Fail closed on a command the reader cannot read", () => {
	const command = "$HOME/bin/git push --force";

	test("the reader marks the program unknown", () => {
		const parsed = parse(command);

		expect(parsed.unknown).toBe(true);
	});

	test("the gate asks", async () => {
		const v = await bash(command);

		expect(v.decision).toBe("ask");
	});
});
