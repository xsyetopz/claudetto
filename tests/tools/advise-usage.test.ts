import { expect, test } from "bun:test";
import { adviseUsage } from "../../tools/advise-usage.ts";

test("`adviseUsage` sums the `advise` lines of a debug log and prices them", () => {
  const log = [
    "noise",
    "[claudetto] `advise`: opus used 1000000 tokens in (400000 read from the cache, 100000 written to the cache), 100000 tokens out.",
    "[claudetto] `advise`: opus used 0 tokens in (0 read from the cache, 0 written to the cache), 0 tokens out.",
  ].join("\n");
  const u = adviseUsage(log);
  expect(u).toMatchObject({ calls: 2, input: 1000000, output: 100000 });
  // 500k fresh * 8 + 400k read * 0.4 + 100k write * 10 + 100k out * 40, per million
  expect(u.cost).toBeCloseTo(4 + 0.16 + 1 + 4, 6);
});

test("`adviseUsage` of a log with no line is zero", () => {
  expect(adviseUsage("x").calls).toBe(0);
});
