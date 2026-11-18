import { describe, expect, test } from "claude-code/testing";

import { cacheHitPercent, formatLine } from "./statusline";

describe("status line", () => {
	test("shows model, context, both limits and cache in one line", () => {
		// Act
		const line = formatLine({ model: "claude-sonnet-5-5", contextPercent: 41.6, fiveHour: 12, sevenDay: 3.2, cacheHit: 97 });

		// Assert
		expect(line).toBe("claude-sonnet-5-5 | ctx 42% | 5h 12% | 7d 3% | cache 97%");
	});

	test("leaves out figures the engine has not reported", () => {
		// Act and Assert
		expect(formatLine({ model: "m" })).toBe("m");
	});

	test("cache hit is cache reads over all prompt tokens", () => {
		// Act and Assert
		expect(cacheHitPercent({ input_tokens: 100, cache_read_input_tokens: 800, cache_creation_input_tokens: 100 })).toBe(80);
		expect(cacheHitPercent({ input_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 })).toBeUndefined();
	});
});
