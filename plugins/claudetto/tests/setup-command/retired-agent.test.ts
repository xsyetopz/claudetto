// A settings file from `0.2.0` names `claudetto:main` in `agent`. Setup removes that key and writes none.

import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";
import { userSettingsLab } from "../../src/blocks/__tests__/lab-support.ts";
import { answering, processResult, run } from "./support.ts";

const FILE = "/home/u/.claude/settings.json";

const keepAll = (on: On): void => {
	on("process.run", () => processResult("Darwin\n", 0));
	answering(on, [], () => "");
};

const writtenIn = (files: readonly { path: string; text: string }[]) =>
	JSON.parse(files.find((file) => file.path === FILE)?.text ?? "{}");

test("setup removes an `agent` key that names `claudetto:main`", async ($: Engine, on: On) => {
	const files = userSettingsLab(
		on,
		'{ "agent": "claudetto:main", "model": "opus" }',
	);
	keepAll(on);

	const text = await run($);

	const written = writtenIn(files);
	expect(written).not.toHaveProperty("agent");
	expect(written.model).toBe("opus");
	expect(text).toContain("claudetto:main");
	expect(text).toContain(`Wrote ${FILE}.`);
});

test("setup leaves an `agent` key that names another agent", async ($: Engine, on: On) => {
	const files = userSettingsLab(on, '{ "agent": "mine:reviewer" }');
	keepAll(on);

	await run($);

	expect(files.find((file) => file.path === FILE)).toBeUndefined();
});

test("a full write holds no `agent` key", async ($: Engine, on: On) => {
	const files = userSettingsLab(on, "{}");
	on("process.run", () => processResult("Darwin\n", 0));
	answering(on, [], (question) =>
		question
			.split("\n")
			.filter((line) => line.startsWith("- "))
			.map((line) => line.slice(2).split(":")[0])
			.join(","),
	);

	await run($);

	expect(writtenIn(files)).not.toHaveProperty("agent");
});
