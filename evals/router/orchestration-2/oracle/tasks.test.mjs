import assert from "node:assert";
import { test } from "node:test";

const load = (f) => import(`../src/${f}.mjs`);

test("last", async () => {
  const { last } = await load("last");
  assert.equal(last([1, 2]), 2);
  assert.equal(last([]), undefined);
  assert.deepEqual(last([1, 2, 3], 2), [2, 3]);
  assert.deepEqual(last([1, 2, 3], 0), []);
  assert.deepEqual(last([1], 5), [1]);
});
test("capitalizeAll", async () => {
  const { capitalizeAll } = await load("cap");
  assert.equal(capitalizeAll("abc"), "Abc");
  assert.equal(capitalizeAll("hELLO  wORLD"), "Hello  World");
  assert.equal(capitalizeAll(""), "");
});
test("zip", async () => {
  const { zip } = await load("zip");
  assert.deepEqual(zip([1, 2], ["a", "b"]), [
    [1, "a"],
    [2, "b"],
  ]);
  assert.deepEqual(zip([1, 2, 3], ["a"]), [[1, "a"]]);
  assert.deepEqual(zip([], [1]), []);
});
test("countBy", async () => {
  const { countBy } = await load("count");
  const m = countBy(["b", "a", "b", "c", "a", "b"]);
  assert.ok(m instanceof Map);
  assert.deepEqual(
    [...m],
    [
      ["b", 3],
      ["a", 2],
      ["c", 1],
    ],
  );
});
test("flatten", async () => {
  const { flatten } = await load("flatten");
  assert.deepEqual(flatten([1, [2, [3, [4]]]]), [1, 2, [3, [4]]]);
  assert.deepEqual(flatten([1, [2, [3, [4]]]], 2), [1, 2, 3, [4]]);
  assert.deepEqual(
    flatten([1, [2, [3, [4]]]], Number.POSITIVE_INFINITY),
    [1, 2, 3, 4],
  );
  assert.deepEqual(flatten([1, [2]], 0), [1, [2]]);
  const xs = [[1], [2]];
  flatten(xs);
  assert.deepEqual(xs, [[1], [2]]);
});
test("isPalindrome", async () => {
  const { isPalindrome } = await load("palin");
  assert.equal(isPalindrome("A man, a plan, a canal: Panama"), true);
  assert.equal(isPalindrome("abc"), false);
  assert.equal(isPalindrome(""), true);
  assert.equal(isPalindrome("!?"), true);
});
test("fromPairs", async () => {
  const { fromPairs } = await load("pairs");
  assert.deepEqual(
    fromPairs([
      ["a", 1],
      ["b", 2],
      ["a", 3],
    ]),
    { a: 3, b: 2 },
  );
  assert.deepEqual(fromPairs([]), {});
  assert.throws(() => fromPairs([["a", 1], "b"]), TypeError);
  assert.throws(() => fromPairs([["a"]]), TypeError);
});
test("roman", async () => {
  const { roman } = await load("roman");
  assert.equal(roman(1994), "MCMXCIV");
  assert.equal(roman(4), "IV");
  assert.equal(roman(3999), "MMMCMXCIX");
  for (const n of [0, 4000, 1.5, -1, "5"])
    assert.throws(() => roman(n), RangeError);
});
test("groupBy", async () => {
  const { groupBy } = await load("group");
  const m = groupBy(["bb", "a", "cc", "d", "eee"], (x) => x.length);
  assert.ok(m instanceof Map);
  assert.deepEqual(
    [...m],
    [
      [2, ["bb", "cc"]],
      [1, ["a", "d"]],
      [3, ["eee"]],
    ],
  );
  const seen = [];
  groupBy(["x", "y"], (x, i) => seen.push([x, i]));
  assert.deepEqual(seen, [
    ["x", 0],
    ["y", 1],
  ]);
  assert.equal(groupBy([], (x) => x).size, 0);
});
test("formatDuration", async () => {
  const { formatDuration } = await load("duration");
  assert.equal(formatDuration(3723000), "1h 2m 3s");
  assert.equal(formatDuration(3600000), "1h");
  assert.equal(formatDuration(61000), "1m 1s");
  assert.equal(formatDuration(1999), "1s");
  assert.equal(formatDuration(0), "0s");
  assert.equal(formatDuration(999), "0s");
  assert.equal(formatDuration(90061000), "25h 1m 1s");
  for (const n of [-1, 1.5, "5", Number.NaN])
    assert.throws(() => formatDuration(n), RangeError);
});
test("popcount", async () => {
  const { popcount } = await load("bits");
  assert.equal(popcount(0), 0);
  assert.equal(popcount(7), 3);
  assert.equal(popcount(2 ** 31), 1);
  assert.equal(popcount(2 ** 40 + 1), 2);
  assert.equal(popcount(Number.MAX_SAFE_INTEGER), 53);
  for (const n of [-1, 0.5, Number.NaN])
    assert.throws(() => popcount(n), RangeError);
});
test("mergeRanges", async () => {
  const { mergeRanges } = await load("ranges");
  assert.deepEqual(
    mergeRanges([
      [8, 10],
      [1, 3],
      [2, 6],
      [10, 12],
    ]),
    [
      [1, 6],
      [8, 12],
    ],
  );
  assert.deepEqual(mergeRanges([[1, 10], [2, 3]]), [[1, 10]]);
  assert.deepEqual(mergeRanges([]), []);
  const rs = [
    [5, 6],
    [1, 5],
  ];
  mergeRanges(rs);
  assert.deepEqual(rs, [
    [5, 6],
    [1, 5],
  ]);
  const merged = mergeRanges(rs);
  merged[0][1] = 99;
  assert.deepEqual(rs, [
    [5, 6],
    [1, 5],
  ]);
});
