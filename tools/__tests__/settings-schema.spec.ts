import { describe, expect, test } from "bun:test";
import { envNamesOf, pagesOf } from "../settings-schema.ts";

describe("the env-var pages", () => {
	test("the index names each group page once, and no page of another folder", () => {
		const index = `- [Auth](https://clawdipedia.cc/configure/env-vars/auth-and-accounts.md)
- [Auth again](https://clawdipedia.cc/configure/env-vars/auth-and-accounts.md)
- [Core](https://clawdipedia.cc/configure/settings/core.md)`;

		expect(pagesOf(index)).toEqual([
			"https://clawdipedia.cc/configure/env-vars/auth-and-accounts.md",
		]);
	});

	test("a name is the first cell of a table row, not a name the prose mentions", () => {
		const page = `Set \`CLAUDE_CONFIG_DIR\` first.

| Variable | Status |
|---|---|
| \`ANTHROPIC_API_KEY\` | [Documented] |
`;

		expect(envNamesOf(page)).toEqual(["ANTHROPIC_API_KEY"]);
	});
});
