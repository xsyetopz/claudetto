import type { On, PromptComposeSection } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";

import { CORE, MODEL_SECTIONS } from "./texts";

const DEFAULT: readonly PromptComposeSection[] = [
	{ id: "lean_body", text: "DEFAULT BODY", scope: "shared" },
	{ id: "memory", text: "MEMORY", scope: "session" },
	{ id: "heron_brook", text: "DEFAULT HAIKU", scope: "session" },
	{ id: "total_tokens", text: "TOKENS", scope: "session" },
];

const compose = ($: Engine, on: On, model: string) => {
	on("prompt.compose", () => ({ sections: DEFAULT }));
	return $.prompt.compose({
		model,
		promptModel: model,
		surfaces: ["terminal"],
		tools: ["Read"],
		outputStyle: null,
		traits: ["lean"],
	});
};

const delta = (model: string, from: string): number =>
	body(model).length - from.length;

const body = (model: string): string =>
	MODEL_SECTIONS.get(model)?.get("lean_body") ?? "";

for (const model of MODEL_SECTIONS.keys()) {
	test(`${model} gets its own body, and the session sections keep their order`, async ($: Engine, on: On) => {
		const { sections } = await compose($, on, model);

		expect(sections.map((s) => s.id)).toEqual(DEFAULT.map((s) => s.id));
		expect(sections.map((s) => s.scope)).toEqual(DEFAULT.map((s) => s.scope));
		expect(sections[0]?.text).toBe(body(model));
		expect(sections[1]?.text).toBe("MEMORY");
		expect(sections[3]?.text).toBe("TOKENS");
	});
}

test("a model with no body keeps the default sections", async ($: Engine, on: On) => {
	const { sections } = await compose($, on, "claude-fable-5-2");

	expect(sections).toEqual(DEFAULT);
});

test("Haiku replaces its default session paragraphs", async ($: Engine, on: On) => {
	const { sections } = await compose($, on, "claude-haiku-5-5");

	expect(sections[2]?.text).toBe(
		MODEL_SECTIONS.get("claude-haiku-5-5")?.get("heron_brook"),
	);
});

test("Opus keeps its default session paragraphs", async ($: Engine, on: On) => {
	const { sections } = await compose($, on, "claude-opus-5-5");

	expect(sections[2]?.text).toBe("DEFAULT HAIKU");
});

test("the core stays under 3,500 chars, and the deltas under their bounds", () => {
	expect(CORE.length).toBeLessThan(3500);
	expect(delta("claude-opus-5-5", CORE)).toBeLessThan(500);
	expect(delta("claude-sonnet-5-5", CORE)).toBeLessThan(900);
	expect(
		MODEL_SECTIONS.get("claude-haiku-5-5")?.get("heron_brook")?.length,
	).toBeLessThan(700);
});

test("the Haiku body is the shortest and has no delegation, and the Opus body has no verification line", () => {
	const lengths = [...MODEL_SECTIONS.keys()].map((m) => body(m).length);

	expect(body("claude-haiku-5-5").length).toBe(Math.min(...lengths));
	expect(body("claude-haiku-5-5")).not.toContain("<delegation>");
	expect(body("claude-opus-5-5")).toContain("<delegation>");
	expect(body("claude-opus-5-5")).not.toMatch(
		/double-check|verify|real check/iu,
	);
});

test("every body keeps the lead-only plugin test rule it has delegation for", () => {
	for (const model of ["claude-opus-5-5", "claude-sonnet-5-5"]) {
		expect(body(model)).toContain("claude plugin test");
		expect(body(model)).not.toContain("model: opus");
	}
});
