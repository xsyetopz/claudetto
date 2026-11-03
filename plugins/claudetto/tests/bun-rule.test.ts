import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";
import { BUN_RULE } from "../src/blocks/bun-rule/block.ts";
import { storeStub } from "./setup-command/support.ts";

const CWD = "/repo";

const lab = (on: On, present: readonly string[]): void => {
	on("fs.exists", (_$, e) => ({
		value: present.some((name) => e.path === `${CWD}/${name}`),
	}));
	// The other `classic.SessionStart` hooks of the plugin read these, and a missing stub skips the chain.
	on("env.get", () => ({ value: undefined }));
	storeStub(on, new Map());
	on("ui.log", () => ({ value: undefined }));
	on("session.version", () => ({
		value: { version: "2.1.317", base: "2.1.317", builtAt: "" },
	}));
	on("session.id", () => ({ value: "s" }));
	on("session.root", () => ({ value: CWD }));
	on("classic.SessionStart", () => ({}));
};

const start = (
	$: Engine,
	source: "startup" | "clear" | "compact" = "startup",
) => $.classic.SessionStart({ source, cwd: CWD });

test("a folder with `package.json` and `bun.lock` adds the `bun` text", async ($: Engine, on: On) => {
	lab(on, ["package.json", "bun.lock"]);

	const out = await start($);

	expect(out.additionalContext).toEqual([BUN_RULE]);
});

test("`clear` and `compact` add the text again", async ($: Engine, on: On) => {
	lab(on, ["package.json", "bun.lock"]);

	expect((await start($, "clear")).additionalContext).toEqual([BUN_RULE]);
	expect((await start($, "compact")).additionalContext).toEqual([BUN_RULE]);
});

test("a folder with only `package.json` adds nothing", async ($: Engine, on: On) => {
	lab(on, ["package.json"]);

	expect((await start($)).additionalContext ?? []).toEqual([]);
});

test("a folder with only `bun.lock` adds nothing", async ($: Engine, on: On) => {
	lab(on, ["bun.lock"]);

	expect((await start($)).additionalContext ?? []).toEqual([]);
});

test(
	"with `bunRuleEnabled` off, nothing is added",
	{ options: { bunRuleEnabled: false } },
	async ($: Engine, on: On) => {
		lab(on, ["package.json", "bun.lock"]);

		expect((await start($)).additionalContext ?? []).toEqual([]);
	},
);
