import { describe, expect, test } from "claude-code/testing";

import { CWD, disk, wireDisk } from "../../patch/__tests__/harness";
import { resetShown } from "../../patch/instructions";
import { TOOL_FULL_NAME } from "../texts";
import { registerRead } from "../tool";

describe("read path-scoped rules", () => {
	const RULE =
		'---\npaths:\n  - "src/api/**/*.ts"\n---\nUse the api error type.\n';

	test("a read of a matching path appends the rule once, as the built-in Read loads it", async ($, on) => {
		// Arrange
		resetShown();
		wireDisk(
			on,
			disk({
				[`${CWD}/.claude/rules/api.md`]: RULE,
				[`${CWD}/src/api/x.ts`]: "a\n"
			})
		);
		registerRead(on);

		// Act
		const first = await $.tool.call({
			tool: TOOL_FULL_NAME,
			file_path: `${CWD}/src/api/x.ts`
		});
		const second = await $.tool.call({
			tool: TOOL_FULL_NAME,
			file_path: `${CWD}/src/api/x.ts`
		});

		// Assert
		expect(first.result).toBe(
			`     1\ta\n\nRule ${CWD}/.claude/rules/api.md applies to src/api/x.ts:\nUse the api error type.`
		);
		expect(second.result).toBe("     1\ta");
	});
});
