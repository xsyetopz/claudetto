import { describe, expect, test } from "claude-code/testing";

import { TOOL_FULL_NAME } from "../texts";
import { registerPatch } from "../tool";
import { CWD, disk, refusal, wireDisk, wrap } from "./harness";

describe("TOOLS-012 Add File refuses an existing path", () => {
	test("an Add File over an existing file refuses and writes nothing", async ($, on) => {
		// Arrange
		const d = disk({ [`${CWD}/notes.txt`]: "Header — kept\r\n[x] done\r\n" });
		wireDisk(on, d);
		registerPatch(on);

		// Act
		const r = await $.tool.call({
			tool: TOOL_FULL_NAME,
			patch: wrap("*** Add File: notes.txt", "+Header")
		});

		// Assert
		expect(refusal(r)).toContain(
			"`notes.txt`: exists; change it with `*** Update File`"
		);
		expect(d.files.get(`${CWD}/notes.txt`)).toBe(
			"Header — kept\r\n[x] done\r\n"
		);
	});

	test("a Delete then Add of one path in one patch refuses and writes nothing", async ($, on) => {
		// Arrange
		const d = disk({ [`${CWD}/notes.txt`]: "Header — kept\r\n[x] done\r\n" });
		wireDisk(on, d);
		registerPatch(on);

		// Act
		const r = await $.tool.call({
			tool: TOOL_FULL_NAME,
			patch: wrap(
				"*** Delete File: notes.txt",
				"*** Add File: notes.txt",
				"+Header"
			)
		});

		// Assert
		expect(refusal(r)).toContain("`notes.txt`: exists");
		expect(d.files.get(`${CWD}/notes.txt`)).toBe(
			"Header — kept\r\n[x] done\r\n"
		);
		expect(d.deleted).toEqual([]);
	});
});
