import { describe, expect, test } from "claude-code/testing";

import { TOOL_FULL_NAME } from "../texts";
import { registerPatch } from "../tool";
import { CWD, disk, wireDisk, wrap } from "./harness";

describe("patch guard parity", () => {
	const input = { patch: wrap("*** Update File: .env", "@@", "-A=1", "+A=2") };

	test("a deny rule on Edit for a path denies the same path through patch", async ($, on) => {
		// Arrange
		const d = disk({ [`${CWD}/.env`]: "A=1\n" });
		wireDisk(on, d, { isAllowing: false });
		registerPatch(on);
		on("tool.check", { tool: TOOL_FULL_NAME }, () => ({ decision: "allow" }));
		on("tool.check", { tool: "Edit" }, (_$, e) =>
			JSON.stringify(e.input).includes(".env")
				? { decision: "deny", reason: "Edit(**/.env) is denied" }
				: { decision: "allow" }
		);
		on("tool.check", { tool: "Write" }, () => ({ decision: "allow" }));

		// Act
		const v = await $.tool.check({ tool: TOOL_FULL_NAME, input });

		// Assert
		expect(v.decision).toBe("deny");
		expect(v.reason).toContain("Edit(**/.env)");
	});

	test("an ask rule on Write for a path asks through patch", async ($, on) => {
		// Arrange
		wireDisk(on, disk({ [`${CWD}/.env`]: "A=1\n" }), { isAllowing: false });
		registerPatch(on);
		on("tool.check", { tool: TOOL_FULL_NAME }, () => ({ decision: "allow" }));
		on("tool.check", { tool: "Edit" }, () => ({ decision: "allow" }));
		on("tool.check", { tool: "Write" }, () => ({
			decision: "ask",
			reason: "Write rule"
		}));

		// Act
		const v = await $.tool.check({ tool: TOOL_FULL_NAME, input });

		// Assert
		expect(v.decision).toBe("ask");
	});

	test("a path that Edit and Write allow is allowed through patch", async ($, on) => {
		// Arrange
		wireDisk(on, disk({ [`${CWD}/.env`]: "A=1\n" }));
		registerPatch(on);
		on("tool.check", { tool: "Edit" }, () => ({ decision: "allow" }));
		on("tool.check", { tool: "Write" }, () => ({ decision: "allow" }));

		// Act
		const v = await $.tool.check({ tool: TOOL_FULL_NAME, input });

		// Assert
		expect(v.decision).toBe("allow");
	});

	test("an edit that only the permission mode asks about leaves patch to the mode, not a dialog", async ($, on) => {
		// Arrange
		wireDisk(on, disk({ [`${CWD}/.env`]: "A=1\n" }), { isAllowing: false });
		registerPatch(on);
		on("tool.check", { tool: TOOL_FULL_NAME }, () => ({ decision: "ask" }));
		on("tool.check", { tool: "Edit" }, () => ({ decision: "ask" }));
		on("tool.check", { tool: "Write" }, () => ({ decision: "ask" }));

		// Act
		const v = await $.tool.check({ tool: TOOL_FULL_NAME, input });

		// Assert
		expect(v.decision).toBe("ask");
		expect(v.plugin).toBeUndefined();
	});

	test("an ask rule on Edit for a path still opens the dialog through patch where the mode also asks", async ($, on) => {
		// Arrange
		wireDisk(on, disk({ [`${CWD}/.env`]: "A=1\n" }), { isAllowing: false });
		registerPatch(on);
		on("tool.check", { tool: TOOL_FULL_NAME }, () => ({ decision: "ask" }));
		on("tool.check", { tool: "Edit" }, () => ({
			decision: "ask",
			rule: "Edit(**/.env)"
		}));
		on("tool.check", { tool: "Write" }, () => ({ decision: "allow" }));

		// Act
		const v = await $.tool.check({ tool: TOOL_FULL_NAME, input });

		// Assert
		expect(v.decision).toBe("ask");
		expect(v.plugin).toBe("claudetto");
	});
});
