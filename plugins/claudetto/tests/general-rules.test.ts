// The general rules reach a session only from the user's `CLAUDE.md`, where `/claudetto:setup` writes them.

import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";
import { GENERAL_RULES } from "../src/blocks/general-rules/rules.ts";
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

test("no session start, `clear`, or `compact` adds the rules text, with or without a user `CLAUDE.md`", async ($: Engine, on: On) => {
	lab(on, "# Mine\n");

	const startup = await sessionStart($, "/repo", "startup");
	const clear = await sessionStart($, "/repo", "clear");
	const compact = await sessionStart($, "/repo", "compact");

	expect(startup.additionalContext ?? []).not.toContain(GENERAL_RULES);
	expect(clear.additionalContext ?? []).not.toContain(GENERAL_RULES);
	expect(compact.additionalContext ?? []).not.toContain(GENERAL_RULES);
});

test("a session with no user `CLAUDE.md` gets no rules text", async ($: Engine, on: On) => {
	lab(on, undefined);

	const out = await sessionStart($, "/repo", "startup");

	expect(out.additionalContext ?? []).not.toContain(GENERAL_RULES);
});
