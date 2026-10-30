import { expect, test } from "bun:test";
import { join } from "node:path";
import { file } from "bun";

const SKILL = join(
	import.meta.dir,
	"..",
	"..",
	"..",
	"..",
	"skills",
	"docs",
	"SKILL.md",
);

/** The commands and flags of `ctx7 --help` in `0.8.2`; a name the CLI lacks fails the lookup. */
const COMMANDS = new Set(["library", "docs"]);
const FLAGS = new Set(["--json", "--language"]);

const CALL = /`bunx ctx7 ([^`]+)`/g;
const FLAG = /--[a-z-]+/g;

test("the `docs` skill names only commands and flags that `ctx7` has", async () => {
	const calls = [...(await file(SKILL).text()).matchAll(CALL)].map(
		(m) => m[1] ?? "",
	);
	expect(calls.length).toBeGreaterThan(0);
	for (const call of calls) {
		expect(COMMANDS).toContain(call.split(" ")[0] ?? "");
		for (const flag of call.match(FLAG) ?? []) {
			expect(FLAGS).toContain(flag);
		}
	}
});
