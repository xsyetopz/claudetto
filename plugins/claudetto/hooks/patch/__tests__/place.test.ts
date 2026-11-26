import { describe, expect, test } from "claude-code/testing";

import { TOOL_FULL_NAME } from "../texts";
import { registerPatch } from "../tool";
import { CWD, disk, refusal, wireDisk, wrap } from "./harness";

describe("patch placement", () => {
	test("an anchor narrows an otherwise ambiguous hunk", async ($, on) => {
		// Arrange
		const d = disk({ [`${CWD}/a.ts`]: "a:\n x\nb:\n x\n" });
		wireDisk(on, d);
		registerPatch(on);

		// Act
		const r = await $.tool.call({
			tool: TOOL_FULL_NAME,
			patch: wrap("*** Update File: a.ts", "@@ b:", "- x", "+ y")
		});

		// Assert
		expect(r.result).toBe("M a.ts +1 -1");
		expect(d.files.get(`${CWD}/a.ts`)).toBe("a:\n x\nb:\n y\n");
	});

	test("context repeated after the anchor edits the copy nearest the anchor", async ($, on) => {
		// Arrange
		const d = disk({ [`${CWD}/a.ts`]: "f:\n run\ng:\n run\n" });
		wireDisk(on, d);
		registerPatch(on);

		// Act
		const r = await $.tool.call({
			tool: TOOL_FULL_NAME,
			patch: wrap("*** Update File: a.ts", "@@ f:", "- run", "+ walk")
		});

		// Assert
		expect(r.result).toBe("M a.ts +1 -1");
		expect(d.files.get(`${CWD}/a.ts`)).toBe("f:\n walk\ng:\n run\n");
	});

	test("after a shell cd into a subfolder, the rest of the project stays writable", async ($, on) => {
		// Arrange
		const d = disk({ [`${CWD}/src/a.ts`]: "a\n", [`${CWD}/top.ts`]: "t\n" });
		wireDisk(on, d, { cwd: `${CWD}/src` });
		registerPatch(on);

		// Act
		const r = await $.tool.call({
			tool: TOOL_FULL_NAME,
			patch: wrap(
				"*** Update File: a.ts",
				"@@",
				"-a",
				"+b",
				`*** Update File: ${CWD}/top.ts`,
				"@@",
				"-t",
				"+u"
			)
		});

		// Assert
		expect(refusal(r)).not.toContain("refused");
		expect(d.files.get(`${CWD}/src/a.ts`)).toBe("b\n");
		expect(d.files.get(`${CWD}/top.ts`)).toBe("u\n");
	});
});
