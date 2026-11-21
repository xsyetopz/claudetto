import { describe, expect, test } from "claude-code/testing";

import { memorySection, STOCK_MEMORY_WRITE } from "../../prompt/memory";
import { TOOL_FULL_NAME } from "../texts";
import { registerPatch } from "../tool";
import { disk, refusal, wireDisk, wrap } from "./harness";

const FOLDER = "/home/u/.claude/projects/-repo/memory";
const STOCK = `You have a persistent file-based memory at \`${FOLDER}/\`. This directory already exists — ${STOCK_MEMORY_WRITE} (do not run mkdir or check for its existence).`;

describe("REQ-TOOLS-001 auto-memory under patch", () => {
	test("the memory section names patch in place of the Write tool when patch is offered", () => {
		// Act
		const offered = memorySection(STOCK, [TOOL_FULL_NAME]);
		const notOffered = memorySection(STOCK, ["Read"]);

		// Assert
		expect(offered).toContain(
			`write to it directly with \`${TOOL_FULL_NAME}\``
		);
		expect(offered).not.toContain("Write tool");
		expect(offered).toContain("(do not run mkdir or check for its existence)");
		expect(notOffered).toBe(STOCK);
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
