import { describe, expect, test } from "bun:test";
import { linesOf, NOW_S } from "./support.ts";

const cacheLine = (cache: Record<string, unknown> | undefined): string =>
	linesOf(cache === undefined ? {} : { prompt_cache: cache }).join("\n");

const WARM = {
	warm: true,
	caching_observed: true,
	ttl: "5m",
	hit_ratio: 0.91,
};

describe("the cache countdown", () => {
	test("a warm cache shows the time left, the `ttl`, and the hit share", () => {
		expect(cacheLine({ ...WARM, expires_at: NOW_S + 252 })).toContain(
			"⌁ 4m/5m 91%",
		);
	});

	test("a cold cache shows `cold` and the tokens a next turn writes again", () => {
		expect(
			cacheLine({
				warm: false,
				caching_observed: true,
				recache_tokens_if_cold: 120_000,
			}),
		).toContain("⌁ cold +120k");
	});

	test("no `prompt_cache`, or `caching_observed` false, shows no cache part and keeps the row", () => {
		const none = cacheLine(undefined);
		const unobserved = cacheLine({
			...WARM,
			caching_observed: false,
			expires_at: NOW_S + 252,
		});
		for (const line of [none, unobserved]) {
			expect(line).not.toContain("⌁");
			expect(line).toContain("Opus 5.5");
		}
	});

	test("an `expires_at` already past reads `0s`, not a negative time", () => {
		const line = cacheLine({ ...WARM, expires_at: NOW_S - 30 });
		expect(line).toContain("⌁ 0s/5m 91%");
		expect(line).not.toContain("⌁ -");
	});

	test("a warm cache with `expires_at` null reads `warm` and the `ttl`", () => {
		expect(cacheLine({ ...WARM, expires_at: null })).toContain("⌁ warm/5m 91%");
	});
});

describe("the cache miss cause", () => {
	const missed = (miss: Record<string, unknown>): string =>
		cacheLine({ ...WARM, expires_at: NOW_S + 252, ...miss });

	test("a miss with `tools_changed` adds `miss: tools changed`", () => {
		expect(
			missed({ misses: 1, last_miss_cause: { causes: ["tools_changed"] } }),
		).toContain("⌁ 4m/5m 91% miss: tools changed");
	});

	test("no misses shows no cause part", () => {
		expect(
			missed({ misses: 0, last_miss_cause: { causes: ["tools_changed"] } }),
		).not.toContain("miss:");
	});

	test("an empty or malformed `causes` shows no cause part", () => {
		for (const last_miss_cause of [
			{ causes: [] },
			{ causes: [3] },
			{ causes: "tools_changed" },
			"tools_changed",
			undefined,
		]) {
			expect(missed({ misses: 2, last_miss_cause })).not.toContain("miss:");
		}
	});

	test("only the first cause is shown, capped at 24 characters", () => {
		const line = missed({
			misses: 1,
			last_miss_cause: {
				causes: ["a_very_long_cause_name_that_overflows", "tools_changed"],
			},
		});
		expect(line).toContain("miss: a very long cause name");
		expect(line).not.toContain("overflows");
		expect(line).not.toContain("tools changed");
	});
});
