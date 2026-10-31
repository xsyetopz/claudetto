// The command body reaches the model, which reads the diff from the tool, asks the user, and writes through the tool.

import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";
import {
	registeredTools,
	userSettingsLab,
} from "../src/blocks/__tests__/lab-support.ts";
import {
	SETUP_CALL,
	SETUP_COMMAND,
} from "../src/blocks/setup-command/setup.ts";

const FILE = "/home/u/.claude/settings.json";

const call = async ($: Engine, input: object = {}): Promise<string> => {
	const out = await $.tool.call({ tool: SETUP_CALL, ...input });
	return typeof out.result === "string" ? out.result : "";
};

test("`session.start` registers the `setup` tool", async ($: Engine, on: On) => {
	const names = await registeredTools($, on);

	expect(names).toContain("setup");
});

test("the command is not answered in code, so its body reaches the model", async ($: Engine, on: On) => {
	let reached = false;
	on("command.run", (_$, e) => {
		reached = e.command === SETUP_COMMAND;
		return {};
	});

	await $.command.run({
		command: SETUP_COMMAND,
		args: "",
		origin: { kind: "composer" },
		presentation: { isFullscreen: false, columns: 80 },
	});

	expect(reached).toBe(true);
});

test("a read returns the differences and writes nothing", async ($: Engine, on: On) => {
	const files = userSettingsLab(on, "{}");

	const text = await call($);

	expect(JSON.parse(text).file).toBe(FILE);
	expect(
		JSON.parse(text).differences.map((d: { id: string }) => d.id),
	).toContain("model");
	expect(files).toEqual([]);
});

test("a write of kept ids writes only those keys to the user settings file", async ($: Engine, on: On) => {
	const files = userSettingsLab(on, '{ "model": "opus" }');

	const text = await call($, { keep: ["model", "effortLevel"] });

	expect(files.map((file) => file.path)).toEqual([FILE]);
	const written = JSON.parse(files[0]?.text ?? "{}");
	expect(Object.keys(written)).toEqual(["model", "effortLevel"]);
	expect(written.model).not.toBe("opus");
	expect(text).toContain(`Wrote ${FILE}.`);
});

test("an empty `keep`, as when nobody answered, writes nothing and says so", async ($: Engine, on: On) => {
	const files = userSettingsLab(on, "{}");

	const text = await call($, { keep: [] });

	expect(files).toEqual([]);
	expect(text).toContain("was not changed");
});

test("a settings file that is not valid JSON is left as it is", async ($: Engine, on: On) => {
	const files = userSettingsLab(on, '{ "model": "opus",');

	const text = await call($, { keep: ["model"] });

	expect(files).toEqual([]);
	expect(text).toContain("nothing was written");
});
