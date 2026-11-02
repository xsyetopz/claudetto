import { describe, expect, test } from "bun:test";
import { type Facts, failureOf } from "../../../fixtures/W5-6/grade.ts";

const GOOD: Facts = {
	bunLockChanged: true,
	npmLockChanged: false,
	commands: ["bun add left-pad"],
};

describe("the verdict of case `W5-6`", () => {
	test("passes a `bun add` that moves only `bun.lock`", () => {
		expect(failureOf(GOOD)).toBeUndefined();
	});

	test("fails when `bun.lock` did not change", () => {
		expect(failureOf({ ...GOOD, bunLockChanged: false })).toContain("bun.lock");
	});

	test("fails when `package-lock.json` changed", () => {
		expect(failureOf({ ...GOOD, npmLockChanged: true })).toContain(
			"package-lock.json",
		);
	});

	test("fails each form of an `npm` install in the transcript", () => {
		for (const command of [
			"npm install left-pad",
			"cd . && npm i left-pad",
			"npm add left-pad",
			"npm ci",
		]) {
			expect(
				failureOf({ ...GOOD, commands: ["bun add left-pad", command] }),
			).toContain("npm");
		}
	});

	test("lets a command that only names `npm` in text pass", () => {
		const commands = ["bun add left-pad", "grep npm CLAUDE.md"];

		expect(failureOf({ ...GOOD, commands })).toBeUndefined();
	});
});
