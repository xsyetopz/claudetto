import { describe, expect, test } from "claude-code/testing";

import { resetShown } from "../instructions";
import { TOOL_FULL_NAME } from "../texts";
import { registerPatch } from "../tool";
import { CWD, disk, wireDisk, wrap } from "./harness";

const swap = (from: string, to: string): string =>
	wrap("*** Update File: pkg/a.ts", "@@", `-${from}`, `+${to}`);

describe("patch tool instructions", () => {
	const RULE =
		'---\npaths:\n  - "src/api/**/*.ts"\n---\nUse the api error type.\n';
	const OTHER = '---\npaths: "docs/**/*.md"\n---\nDocs rule.\n';

	test("a patch to a matching path appends the path-scoped rule once, not again, and skips a non-matching rule", async ($, on) => {
		// Arrange
		resetShown();
		const d = disk({
			[`${CWD}/.claude/rules/api.md`]: RULE,
			[`${CWD}/.claude/rules/docs.md`]: OTHER,
			[`${CWD}/src/api/x.ts`]: "a\n"
		});
		wireDisk(on, d);
		registerPatch(on);
		const patch = wrap("*** Update File: src/api/x.ts", "@@", "-a", "+b");

		// Act
		const firstCall = await $.tool.call({ tool: TOOL_FULL_NAME, patch });
		const secondCall = await $.tool.call({
			tool: TOOL_FULL_NAME,
			patch: wrap("*** Update File: src/api/x.ts", "@@", "-b", "+c")
		});
		const first = firstCall.result;
		const second = secondCall.result;

		// Assert
		expect(first).toBe(
			`M src/api/x.ts +1 -1\n\nRule \`${CWD}/.claude/rules/api.md\` applies to \`src/api/x.ts\`:\nUse the api error type.`
		);
		expect(second).toBe("M src/api/x.ts +1 -1");
	});

	test("with CLAUDE_CODE_DISABLE_CLAUDE_MDS set, a matching rule is not appended", async ($, on) => {
		// Arrange
		resetShown();
		const d = disk({
			[`${CWD}/.claude/rules/api.md`]: RULE,
			[`${CWD}/src/api/x.ts`]: "a\n"
		});
		wireDisk(on, d, { env: { CLAUDE_CODE_DISABLE_CLAUDE_MDS: "1" } });
		registerPatch(on);

		// Act
		const call = await $.tool.call({
			tool: TOOL_FULL_NAME,
			patch: wrap("*** Update File: src/api/x.ts", "@@", "-a", "+b")
		});

		// Assert
		expect(call.result).toBe("M src/api/x.ts +1 -1");
	});

	test("a CLAUDE.md in a subdirectory is appended once", async ($, on) => {
		// Arrange
		resetShown();
		const d = disk({ [`${CWD}/pkg/a.ts`]: "a\n" });
		d.nested.push({
			dir: `${CWD}/pkg`,
			name: "CLAUDE.md",
			content: "<!-- note -->\nPackage rule."
		});
		wireDisk(on, d);
		registerPatch(on);

		// Act
		const firstCall = await $.tool.call({
			tool: TOOL_FULL_NAME,
			patch: swap("a", "b")
		});
		const secondCall = await $.tool.call({
			tool: TOOL_FULL_NAME,
			patch: swap("b", "c")
		});
		const first = firstCall.result;
		const second = secondCall.result;

		// Assert
		expect(first).toBe(
			`M pkg/a.ts +1 -1\n\nInstructions \`${CWD}/pkg/CLAUDE.md\` apply to \`pkg/a.ts\`:\nPackage rule.`
		);
		expect(second).toBe("M pkg/a.ts +1 -1");
	});
});
