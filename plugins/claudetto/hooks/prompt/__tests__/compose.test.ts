import type { On } from "claude-code";
import { describe, type Engine, expect, test } from "claude-code/testing";

import { CONDUCT_ID } from "../conduct";

const MODEL = "claude-opus-5-5";

/** Composes the lean prompt for a request that offers `tools`. */
const compose = ($: Engine, tools: readonly string[]) =>
	$.prompt.compose({
		model: MODEL,
		promptModel: MODEL,
		surfaces: [],
		tools,
		outputStyle: null,
		traits: ["lean"]
	});

const OFFERED = ["Read", "Bash"] as const;

/** Stands in for the engine's own composition beneath the plugin's hook. */
const engine = (on: On): void => {
	on("prompt.compose", () => ({
		sections: [
			{ id: "lean_body", text: "body", scope: "shared" },
			{ id: "tools", text: "tools", scope: "shared" },
			{ id: "memory", text: "write with the Write tool", scope: "session" }
		]
	}));
};

describe("TOOLS-032 prompt.compose", () => {
	test("shared sections stay ahead of session ones, in the engine's order, and other sections are untouched", async ($, on) => {
		// Arrange
		engine(on);

		// Act
		const { sections } = await compose($, OFFERED);

		// Assert
		expect(sections.map((s) => `${s.id}:${s.scope}`)).toEqual([
			"lean_body:shared",
			"tools:shared",
			`${CONDUCT_ID}:shared`,
			"memory:session"
		]);
		expect(sections[3]?.text).toBe("write with the Write tool");
		const firstSession = sections.findIndex((s) => s.scope === "session");
		expect(sections.slice(firstSession).map((s) => s.scope)).not.toContain(
			"shared"
		);
	});

	test("a list with only session sections gets the conduct section first", async ($, on) => {
		// Arrange
		on("prompt.compose", () => ({
			sections: [{ id: "memory", text: "m", scope: "session" }]
		}));

		// Act
		const { sections } = await compose($, OFFERED);

		// Assert
		expect(sections.map((s) => `${s.id}:${s.scope}`)).toEqual([
			`${CONDUCT_ID}:shared`,
			"memory:session"
		]);
	});

	test("a bare prompt gets no conduct section", async ($, on) => {
		// Arrange
		on("prompt.compose", () => ({
			sections: [{ id: "bare", text: "b", scope: "shared" }]
		}));

		// Act
		const { sections } = await $.prompt.compose({
			model: MODEL,
			promptModel: MODEL,
			surfaces: [],
			tools: OFFERED,
			outputStyle: null,
			traits: ["bare"]
		});

		// Assert
		expect(sections.map((s) => s.id)).toEqual(["bare"]);
	});
});
