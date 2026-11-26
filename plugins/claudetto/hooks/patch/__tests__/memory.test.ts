import { describe, expect, test } from "claude-code/testing";

import { TOOL_FULL_NAME } from "../texts";
import { registerPatch } from "../tool";
import { disk, refusal, wireDisk, wrap } from "./harness";

const FOLDER = "/home/u/.claude/projects/-repo/memory";
const STOCK = `You have a persistent file-based memory at \`${FOLDER}/\`. This directory already exists — write to it directly with the Write tool (do not run mkdir or check for its existence).`;

describe("TOOLS-001 auto-memory under patch", () => {
	test("the memory section points writes at patch when patch is offered and stays as it came when not", async ($, on) => {
		// Arrange
		wireDisk(on, disk({}));
		registerPatch(on);
		on("prompt.compose", () => ({
			sections: [{ id: "memory", text: STOCK, scope: "session" }]
		}));
		const request = (tools: string[]) =>
			$.prompt.compose({
				model: "claude-opus-5-5",
				promptModel: "claude-opus-5-5",
				surfaces: [],
				tools,
				outputStyle: null,
				traits: ["lean"]
			});

		// Act
		const offered = await request([TOOL_FULL_NAME]);
		const notOffered = await request(["Read"]);

		// Assert
		const textOf = (r: typeof offered) =>
			r.sections.find((s) => s.id === "memory")?.text;
		expect(textOf(offered)).toContain(TOOL_FULL_NAME);
		expect(textOf(notOffered)).toBe(STOCK);
	});

	test("patch writes inside the memory folder the prompt names, and still refuses its parent", async ($, on) => {
		// Arrange: the engine creates the folder before the prompt names it.
		const d = disk({ [`${FOLDER}/MEMORY.md`]: "" });
		wireDisk(on, d);
		registerPatch(on);
		on("prompt.compose", () => ({
			sections: [{ id: "memory", text: STOCK, scope: "session" }]
		}));
		await $.prompt.compose({
			model: "claude-opus-5-5",
			promptModel: "claude-opus-5-5",
			surfaces: [],
			tools: [TOOL_FULL_NAME],
			outputStyle: null,
			traits: ["lean"]
		});

		// Act
		const inside = await $.tool.call({
			tool: TOOL_FULL_NAME,
			patch: wrap(`*** Add File: ${FOLDER}/fact.md`, "+one fact")
		});
		const parent = await $.tool.call({
			tool: TOOL_FULL_NAME,
			patch: wrap("*** Add File: /home/u/.claude/projects/-repo/x.md", "+x")
		});

		// Assert
		expect(inside.result).toBe(`A ${FOLDER}/fact.md`);
		expect(d.files.get(`${FOLDER}/fact.md`)).toBe("one fact\n");
		expect(refusal(parent)).toContain("outside the session directory");
	});
});
