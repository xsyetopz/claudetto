import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";
import { BUN_RULE } from "../src/blocks/bun-rule/block.ts";
import { sessionStart, sessionStartStubs } from "./session-start-support.ts";

const CWD = "/repo";

const lab = (on: On, present: readonly string[]): void => {
	on("fs.exists", (_$, e) => ({
		value: present.some((name) => e.path === `${CWD}/${name}`),
	}));
	on("env.get", () => ({ value: undefined }));
	sessionStartStubs(on, CWD);
};

const start = (
	$: Engine,
	source: "startup" | "clear" | "compact" = "startup",
) => sessionStart($, CWD, source);

/** The texts a start adds. */
const added = (out: {
	additionalContext?: readonly string[];
}): readonly string[] => out.additionalContext ?? [];

test("a folder with `package.json` and `bun.lock` adds the `bun` text", async ($: Engine, on: On) => {
	lab(on, ["package.json", "bun.lock"]);

	const out = await start($);

	expect(added(out)).toEqual([BUN_RULE]);
});

test("`clear` and `compact` add the text again", async ($: Engine, on: On) => {
	lab(on, ["package.json", "bun.lock"]);

	expect(added(await start($, "clear"))).toEqual([BUN_RULE]);
	expect(added(await start($, "compact"))).toEqual([BUN_RULE]);
});

test("a folder with only `package.json` adds nothing", async ($: Engine, on: On) => {
	lab(on, ["package.json"]);

	expect(added(await start($))).toEqual([]);
});

test("a folder with only `bun.lock` adds nothing", async ($: Engine, on: On) => {
	lab(on, ["bun.lock"]);

	expect(added(await start($))).toEqual([]);
});

test(
	"with `bunRuleEnabled` off, nothing is added",
	{ options: { bunRuleEnabled: false } },
	async ($: Engine, on: On) => {
		lab(on, ["package.json", "bun.lock"]);

		expect(added(await start($))).toEqual([]);
	},
);
