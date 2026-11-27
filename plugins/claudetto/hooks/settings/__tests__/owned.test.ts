import { describe, expect, test } from "claude-code/testing";

import { fillSettings } from "../defaults";
import type { OwnedKey } from "../owned";
import { isRecord } from "../settings";

interface Filled {
	env: Record<string, string | undefined>;
	legacy?: unknown;
	outputStyle: string;
}

const parsed = (text: string | undefined): Filled => {
	const value: unknown = JSON.parse(text ?? "");
	if (!isRecord(value)) {
		throw new Error("settings text is not a JSON object");
	}
	return { env: {}, outputStyle: "", ...value };
};

describe("ownership record", () => {
	test("takes back a key the last fill wrote when the construction no longer names it, and keeps a value the user changed", () => {
		// Arrange
		const previous: OwnedKey[] = [
			{ path: ["env", "OLD_SWITCH"], value: "1" },
			{ path: ["env", "CHANGED_SWITCH"], value: "1" },
			{ path: ["legacy", "nested"], value: true },
			{ path: ["outputStyle"], value: "claudetto:Claudetto" }
		];
		const text = JSON.stringify({
			env: { OLD_SWITCH: "1", CHANGED_SWITCH: "mine" },
			legacy: { nested: true }
		});

		// Act
		const fill = fillSettings(text, undefined, previous);
		const next = parsed(fill?.text);

		// Assert
		expect(next.env).not.toHaveProperty("OLD_SWITCH");
		expect(next.env).toMatchObject({ CHANGED_SWITCH: "mine" });
		expect(next).not.toHaveProperty("legacy");
		expect(next.outputStyle).toBe("claudetto:Claudetto");
		expect(fill?.added).toEqual(
			expect.arrayContaining([
				"removed `env.OLD_SWITCH`",
				"removed `legacy.nested`"
			])
		);
		expect(fill?.added).not.toContain("removed env.CHANGED_SWITCH");
	});
});
