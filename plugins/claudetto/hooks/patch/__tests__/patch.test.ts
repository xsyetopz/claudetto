import { describe, expect, test } from "claude-code/testing";

import { TOOL_DESCRIPTION, TOOL_FULL_NAME } from "../texts";
import { registerPatch } from "../tool";
import { CWD, disk, refusal, wireDisk, wrap } from "./harness";

const SRC =
	"function a() {\n\treturn 1;\n}\n\nfunction b() {\n\treturn 2;\n}\n";

describe("patch tool", () => {
	test("the description stays within 200 characters", () => {
		// Assert
		expect(TOOL_DESCRIPTION.length).toBeLessThanOrEqual(200);
	});

	test("an Add File creates the file and replies A", async ($, on) => {
		// Arrange
		const d = disk({});
		wireDisk(on, d);
		registerPatch(on);

		// Act
		const r = await $.tool.call({
			tool: TOOL_FULL_NAME,
			patch: wrap("*** Add File: src/new.ts", "+one", "+two")
		});

		// Assert
		expect(r.result).toBe("A src/new.ts");
		expect(d.files.get(`${CWD}/src/new.ts`)).toBe("one\ntwo\n");
	});

	test("an Update with two hunks edits both and counts lines", async ($, on) => {
		// Arrange
		const d = disk({ [`${CWD}/a.ts`]: SRC });
		wireDisk(on, d);
		registerPatch(on);

		// Act
		const r = await $.tool.call({
			tool: TOOL_FULL_NAME,
			patch: wrap(
				"*** Update File: a.ts",
				"@@ function a() {",
				"-\treturn 1;",
				"+\treturn 10;",
				"+\t// ten",
				"@@ function b() {",
				"-\treturn 2;",
				"+\treturn 20;"
			)
		});

		// Assert
		expect(r.result).toBe("M a.ts +3 -2");
		expect(d.files.get(`${CWD}/a.ts`)).toBe(
			"function a() {\n\treturn 10;\n\t// ten\n}\n\nfunction b() {\n\treturn 20;\n}\n"
		);
	});

	test("a Delete File removes the file and replies D", async ($, on) => {
		// Arrange
		const d = disk({ [`${CWD}/old.ts`]: "x\n" });
		wireDisk(on, d);
		registerPatch(on);

		// Act
		const r = await $.tool.call({
			tool: TOOL_FULL_NAME,
			patch: wrap("*** Delete File: old.ts")
		});

		// Assert
		expect(r.result).toBe("D old.ts");
		expect(d.deleted).toEqual([`${CWD}/old.ts`]);
	});

	test("Move to writes the edited text at the new path and removes the old", async ($, on) => {
		// Arrange
		const d = disk({ [`${CWD}/a.ts`]: "alpha\nbeta\n" });
		wireDisk(on, d);
		registerPatch(on);

		// Act
		const r = await $.tool.call({
			tool: TOOL_FULL_NAME,
			patch: wrap(
				"*** Update File: a.ts",
				"*** Move to: lib/b.ts",
				"@@",
				" alpha",
				"-beta",
				"+gamma"
			)
		});

		// Assert
		expect(r.result).toBe("R a.ts -> lib/b.ts +1 -1");
		expect(d.files.get(`${CWD}/lib/b.ts`)).toBe("alpha\ngamma\n");
		expect(d.files.has(`${CWD}/a.ts`)).toBe(false);
	});

	test("context that differs only in trailing whitespace and indentation still matches and keeps the file's line", async ($, on) => {
		// Arrange
		const d = disk({ [`${CWD}/a.ts`]: "keep  \n\tfoo();\nend\n" });
		wireDisk(on, d);
		registerPatch(on);

		// Act
		const r = await $.tool.call({
			tool: TOOL_FULL_NAME,
			patch: wrap("*** Update File: a.ts", "@@", " keep", "-foo();", "+bar();")
		});

		// Assert
		expect(r.result).toBe("M a.ts +1 -1");
		expect(d.files.get(`${CWD}/a.ts`)).toBe("keep  \nbar();\nend\n");
	});

	test("missing context refuses the whole patch, names the file, hunk and nearest line, and writes nothing", async ($, on) => {
		// Arrange
		const d = disk({ [`${CWD}/a.ts`]: SRC, [`${CWD}/b.ts`]: "x\n" });
		wireDisk(on, d);
		registerPatch(on);

		// Act
		const r = await $.tool.call({
			tool: TOOL_FULL_NAME,
			patch: wrap(
				"*** Update File: b.ts",
				"@@",
				"-x",
				"+y",
				"*** Update File: a.ts",
				"@@",
				"-\treturn 3;",
				"+\treturn 4;"
			)
		});

		// Assert
		expect(refusal(r)).toContain(
			"a.ts: hunk 1: context not found; nearest is line"
		);
		expect(d.files.get(`${CWD}/b.ts`)).toBe("x\n");
		expect(d.files.get(`${CWD}/a.ts`)).toBe(SRC);
	});

	test("ambiguous context refuses the whole patch and writes nothing", async ($, on) => {
		// Arrange
		const d = disk({ [`${CWD}/a.ts`]: "x\ny\nx\ny\n" });
		wireDisk(on, d);
		registerPatch(on);

		// Act
		const r = await $.tool.call({
			tool: TOOL_FULL_NAME,
			patch: wrap("*** Update File: a.ts", "@@", " x", "-y", "+z")
		});

		// Assert
		expect(refusal(r)).toContain(
			"a.ts: hunk 1: context matches 2 places (lines 1, 3)"
		);
		expect(d.files.get(`${CWD}/a.ts`)).toBe("x\ny\nx\ny\n");
	});

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

	test("a path outside the session directory is refused with the reason", async ($, on) => {
		// Arrange
		const d = disk({});
		wireDisk(on, d);
		registerPatch(on);

		// Act
		const up = await $.tool.call({
			tool: TOOL_FULL_NAME,
			patch: wrap("*** Add File: ../other/x.ts", "+x")
		});
		const abs = await $.tool.call({
			tool: TOOL_FULL_NAME,
			patch: wrap("*** Add File: /etc/x", "+x")
		});

		// Assert
		expect(refusal(up)).toContain("outside the session directory /repo");
		expect(refusal(abs)).toContain("outside the session directory /repo");
		expect(d.files.size).toBe(0);
	});

	test("an absolute path inside the session directory is accepted", async ($, on) => {
		// Arrange
		const d = disk({});
		wireDisk(on, d);
		registerPatch(on);

		// Act
		const r = await $.tool.call({
			tool: TOOL_FULL_NAME,
			patch: wrap(`*** Add File: ${CWD}/x.ts`, "+x")
		});

		// Assert
		expect(r.result).toBe(`A ${CWD}/x.ts`);
	});

	test("CRLF endings and a missing final newline are kept", async ($, on) => {
		// Arrange
		const d = disk({ [`${CWD}/a.txt`]: "one\r\ntwo\r\nthree" });
		wireDisk(on, d);
		registerPatch(on);

		// Act
		await $.tool.call({
			tool: TOOL_FULL_NAME,
			patch: wrap("*** Update File: a.txt", "@@", " one", "-two", "+2")
		});

		// Assert
		expect(d.files.get(`${CWD}/a.txt`)).toBe("one\r\n2\r\nthree");
	});

	test("a hunk marked End of File appends at the end", async ($, on) => {
		// Arrange
		const d = disk({ [`${CWD}/a.txt`]: "one\ntwo\n" });
		wireDisk(on, d);
		registerPatch(on);

		// Act
		await $.tool.call({
			tool: TOOL_FULL_NAME,
			patch: wrap(
				"*** Update File: a.txt",
				"@@",
				" two",
				"+three",
				"*** End of File"
			)
		});

		// Assert
		expect(d.files.get(`${CWD}/a.txt`)).toBe("one\ntwo\nthree\n");
	});

	test("a malformed envelope is refused", async ($, on) => {
		// Arrange
		wireDisk(on, disk({}));
		registerPatch(on);

		// Act
		const r = await $.tool.call({ tool: TOOL_FULL_NAME, patch: "nonsense" });

		// Assert
		expect(refusal(r)).toContain('patch must start with "*** Begin Patch"');
	});
});
