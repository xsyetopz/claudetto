import { describe, expect, test } from "bun:test";
import { contextManagementText, handoffText, type Tail } from "../handoff.ts";
import { sourceLine } from "../read-back.ts";

const TAIL: Tail = {
	turns: [
		{ role: "user", text: "Rename `fetchUser` to `getUser`." },
		{ role: "assistant", text: "Renaming it." },
	],
	paths: ["src/api.ts"],
	written: ["src/api.ts"],
};

const BUILT = handoffText(TAIL, "2026-10-31T13:02:29.396Z");

const headingsOf = (text: string): string[] =>
	text.split("\n").filter((line) => line.startsWith("#"));

const NINE = [
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
];

describe("one handoff layout for both writers", () => {
	test("the code-built file has the title and the nine `##` headings in order, and no other heading", () => {
		expect(headingsOf(BUILT)).toEqual(NINE);
	});

	test("the code-built file puts the turns under Current state and the paths under Key files and symbols", () => {
		const section = (name: string): string =>
			BUILT.split(`## ${name}\n`)[1]?.split("\n## ")[0] ?? "";
		expect(section("Current state")).toContain("Rename `fetchUser`");
		expect(section("Key files and symbols")).toContain("`src/api.ts`");
		expect(section("Decisions log")).toContain("Code could not read");
	});

	test("`sourceLine` still tells a code-built file from one Claude wrote", () => {
		const claudes = contextManagementText().slice(
			contextManagementText().indexOf("# Handoff"),
		);
		expect(sourceLine(BUILT)).toContain("built by code");
		expect(sourceLine(claudes)).toContain("written by Claude");
	});
});
