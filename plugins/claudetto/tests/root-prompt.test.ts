import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";
import { ROOT_PROMPT } from "../src/blocks/root-prompt/body.ts";

/** A section an engine below the hook would have answered, such as the default `intro`. */
const engineSections = (on: On): void => {
	on("prompt.compose", () => ({
		sections: [
			{ id: "intro", text: "The default intro.", scope: "shared" },
			{ id: "session_guidance", text: "A session section.", scope: "session" },
		],
	}));
};

test("the main loop's prompt is the root prompt alone, as one `shared` section", async ($: Engine, on: On) => {
	engineSections(on);

	const out = await $.prompt.compose({
		model: "claude-opus-5-5",
		promptModel: "claude-opus-5-5",
		surfaces: ["terminal"],
		tools: ["Read", "Edit"],
		outputStyle: null,
		traits: [],
	});

	expect(out.sections).toEqual([
		{ id: "claudetto:root", text: ROOT_PROMPT, scope: "shared" },
	]);
});

test("the root prompt opens on its role and holds no agent frontmatter", () => {
	expect(ROOT_PROMPT.startsWith("<role>")).toBe(true);
	expect(ROOT_PROMPT).not.toContain("name: main");
});
