// `/claudetto:handoff` is a prompt command: its file is the request that tells the model to call the tool.

import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { HANDOFF_CALL } from "../../plugins/claudetto/src/blocks/handoff/handoff.ts";
import { HANDOFF_INPUT_SCHEMA } from "../../plugins/claudetto/src/blocks/handoff/tool.ts";

const REQUEST = await readFile(
	`${import.meta.dir}/../../plugins/claudetto/commands/handoff.md`,
	"utf8",
);

test("the command file tells the model to call the tool, inside the request tag", () => {
	expect(REQUEST).toContain(`\`${HANDOFF_CALL}\``);
	expect(REQUEST).toContain("<handoff_request>");
	expect(REQUEST).toContain("</handoff_request>");
});

test("the request tells the model to re-word the user's prompts under `standing`", () => {
	expect(REQUEST).toContain("`standing`");
	expect(REQUEST).toContain("re-word");
	expect(REQUEST).not.toContain("word for word");
});

test("the request tells the model to write `[REDACTED]` for a key", () => {
	expect(REQUEST).toContain("[REDACTED]");
});

test("the tool asks for the five fields and no other", () => {
	expect(Object.keys(HANDOFF_INPUT_SCHEMA.properties)).toEqual([
		"goal",
		"standing",
		"state",
		"decisions",
		"next_prompt",
	]);
});
