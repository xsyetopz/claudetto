import { describe, expect, test } from "claude-code/testing";

import { cacheHitPercent, formatLine } from "../statusline";

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

	test("never shows 100% for a figure that is still below 100", () => {
		// Act
		const line = formatLine({ contextPercent: 99.6, fiveHour: 99.5, sevenDay: 100, cacheHit: cacheHitPercent({ input_tokens: 4, cache_read_input_tokens: 996, cache_creation_input_tokens: 0 }) });

		// Assert
		expect(line).toBe("ctx 99% | 5h 99% | 7d 100% | cache 99%");
	});

	test("cache hit is cache reads over all prompt tokens", () => {
		// Act and Assert
		expect(cacheHitPercent({ input_tokens: 100, cache_read_input_tokens: 800, cache_creation_input_tokens: 100 })).toBe(80);
		expect(cacheHitPercent({ input_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 })).toBeUndefined();
	});
});
