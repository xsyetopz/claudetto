import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";
import {
	GENERAL_RULES,
	GENERAL_SECTION,
} from "../src/blocks/general-rules/rules.ts";
import { sessionStart, sessionStartStubs } from "./session-start-support.ts";

const USER_MD = "/home/u/.claude/CLAUDE.md";

/** A session in an empty `/repo` whose user `CLAUDE.md` holds `userMd`, or is absent. */
const lab = (on: On, userMd: string | undefined): void => {
	on("env.get", (_$, e) => ({
		value: e.name === "HOME" ? "/home/u" : undefined,
	}));
	on("fs.exists", (_$, e) => ({
		value: e.path === USER_MD && userMd !== undefined,
	}));
	on("fs.read", (_$, e) => {
		if (e.path !== USER_MD || userMd === undefined) {
			throw new Error("no file");
		}
		return { value: userMd };
	});
	sessionStartStubs(on, "/repo");
};

const start = (
	$: Engine,
	source: "startup" | "clear" | "compact" = "startup",
) => sessionStart($, "/repo", source);

test("a session whose user `CLAUDE.md` lacks the section gets the general rules", async ($: Engine, on: On) => {
	lab(on, "# Mine\n");

	expect((await start($)).additionalContext).toEqual([GENERAL_RULES]);
});

test("a session with no user `CLAUDE.md` gets the general rules", async ($: Engine, on: On) => {
	lab(on, undefined);

	expect((await start($)).additionalContext).toEqual([GENERAL_RULES]);
});

test("`clear` and `compact` add the rules again", async ($: Engine, on: On) => {
	lab(on, undefined);

	expect((await start($, "clear")).additionalContext).toEqual([GENERAL_RULES]);
	expect((await start($, "compact")).additionalContext).toEqual([
		GENERAL_RULES,
	]);
});

test("a user `CLAUDE.md` that holds the marked section adds nothing, since the session reads the rules there", async ($: Engine, on: On) => {
	lab(on, `# Mine\n\n${GENERAL_SECTION}\n`);

	expect((await start($)).additionalContext ?? []).toEqual([]);
});
