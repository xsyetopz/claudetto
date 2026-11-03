import { expect, test } from "bun:test";
import { readdir } from "node:fs/promises";

test("the plugin ships four subagent types and no `main`, so none is listed or dispatched", async () => {
	expect((await readdir("plugins/claudetto/agents")).sort()).toEqual([
		"Artemis.md",
		"Athena.md",
		"Hephaestus.md",
		"Hermes.md",
	]);
});
