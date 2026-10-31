import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";
import { MINIMUM_VERSION } from "../src/tiers/disables.ts";

const lab = (on: On, base: string | undefined): string[] => {
	const lines: string[] = [];
	on("session.version", () => ({
		value: {
			version: base ?? "local",
			...(base === undefined ? {} : { base }),
			builtAt: "2026-10-30T00:00:00Z",
		},
	}));
	on("ui.log", (_$, e) => {
		lines.push(e.text);
		return { value: undefined };
	});
	// No handoff folder, so the handoff block's read-back on a resume stays silent.
	on("fs.exists", () => ({ value: false }));
	on("classic.SessionStart", () => ({}));
	return lines;
};

test("`2.1.311` at startup adds one line naming it and the minimum version", async ($: Engine, on: On) => {
	const lines = lab(on, "2.1.311");

	await $.classic.SessionStart({ source: "startup" });

	expect(lines).toHaveLength(1);
	expect(lines[0]).toContain("2.1.311");
	expect(lines[0]).toContain(MINIMUM_VERSION);
});

test("the minimum version at startup adds no line", async ($: Engine, on: On) => {
	const lines = lab(on, MINIMUM_VERSION);

	await $.classic.SessionStart({ source: "startup" });

	expect(lines).toEqual([]);
});

test("a later release adds no line, compared by numeric parts", async ($: Engine, on: On) => {
	const lines = lab(on, "2.1.1000");

	await $.classic.SessionStart({ source: "startup" });

	expect(lines).toEqual([]);
});

test("a development build of `2.1.311` warns like its release", async ($: Engine, on: On) => {
	const lines = lab(on, "2.1.311-dev");

	await $.classic.SessionStart({ source: "startup" });

	expect(lines).toHaveLength(1);
});

test("`2.1.311` on a resume adds no line, so a session warns once", async ($: Engine, on: On) => {
	const lines = lab(on, "2.1.311");

	await $.classic.SessionStart({ source: "resume" });

	expect(lines).toEqual([]);
});

test("a version not spelled as a release adds no line", async ($: Engine, on: On) => {
	const lines = lab(on, undefined);

	await $.classic.SessionStart({ source: "startup" });

	expect(lines).toEqual([]);
});
