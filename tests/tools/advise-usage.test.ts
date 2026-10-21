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
  // 500k fresh * 4 + 400k read * 0.2 + 100k write * 5 + 100k out * 20, per million
  expect(u.cost).toBeCloseTo(2 + 0.08 + 0.5 + 2, 6);
});

test("`adviseUsage` of a log with no line is zero", () => {
  expect(adviseUsage("x").calls).toBe(0);
});

import { advicePoints, findingsPoints } from "../../tools/advise-usage.ts";

test("`advicePoints` needs the function and the words of its fault close together", () => {
  expect(
    advicePoints("verifyToken never checks exp, so a token lives forever."),
  ).toEqual(["verifyToken"]);
  expect(advicePoints("verifyToken is fine.")).toEqual([]);
  expect(advicePoints("The exp is checked.")).toEqual([]);
  expect(
    advicePoints(
      `extractFile: chmod with entry mode.\n${"x".repeat(900)}\ndownloadHeader is safe`,
    ),
  ).toEqual(["extractFile"]);
});

test("`findingsPoints` reads the lines of `FINDINGS.txt`", () => {
  const text =
    "- `codeOk`: Number() coerces 1e3\ninlineData: JSON in a script can break out\nnoise: exp";
  expect(findingsPoints(text)).toEqual(["codeOk", "inlineData"]);
});
