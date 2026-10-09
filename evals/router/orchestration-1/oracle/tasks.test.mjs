import assert from "node:assert";
import { test } from "node:test";

const load = (f) => import(`../src/${f}.mjs`);

test("padLeft", async () => {
  const { padLeft } = await load("pad");
  assert.equal(padLeft("a", 3), "  a");
  assert.equal(padLeft("7", 3, "0"), "007");
  assert.equal(padLeft("abcd", 3), "abcd");
  assert.throws(() => padLeft("a", 3, "ab"), RangeError);
  assert.throws(() => padLeft("a", 3, ""), RangeError);
});
test("clamp", async () => {
  const { clamp } = await load("clamp");
  assert.equal(clamp(5, 0, 3), 3);
  assert.equal(clamp(-1, 0, 3), 0);
  assert.equal(clamp(2, 0, 3), 2);
  assert.throws(() => clamp(1, 3, 0), RangeError);
  assert.throws(() => clamp(Number.NaN, 0, 3), TypeError);
});
test("uniq", async () => {
  const { uniq } = await load("uniq");
  assert.deepEqual(uniq([1, 2, 1, 3, 2]), [1, 2, 3]);
  assert.deepEqual(uniq([Number.NaN, Number.NaN, 1]), [Number.NaN, 1]);
  assert.deepEqual(
    uniq([{ id: 1, v: "a" }, { id: 2 }, { id: 1, v: "b" }], (o) => o.id),
    [{ id: 1, v: "a" }, { id: 2 }],
  );
});
test("chunk", async () => {
  const { chunk } = await load("chunk");
  assert.deepEqual(chunk([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
  assert.deepEqual(chunk([], 3), []);
  for (const n of [0, -1, 1.5, "2"])
    assert.throws(() => chunk([1], n), RangeError);
});
test("median", async () => {
  const { median } = await load("median");
  assert.equal(median([3, 1, 2]), 2);
  assert.equal(median([10, 2, 4, 1]), 3);
  assert.equal(median([]), undefined);
  const xs = [3, 1, 2];
  median(xs);
  assert.deepEqual(xs, [3, 1, 2]);
});
test("camelCase", async () => {
  const { camelCase } = await load("camel");
  assert.equal(camelCase("foo-bar_baz qux"), "fooBarBazQux");
  assert.equal(camelCase("--foo__bar  "), "fooBar");
  assert.equal(camelCase("Foo HTTPServer"), "fooHTTPServer");
  assert.equal(camelCase(""), "");
});
test("compareVersions", async () => {
  const { compareVersions } = await load("semver");
  assert.equal(compareVersions("1.10.0", "1.9.2"), 1);
  assert.equal(compareVersions("1.2", "1.2.0"), 0);
  assert.equal(compareVersions("1.2.0", "1.10"), -1);
  assert.equal(compareVersions("1.0.0-rc.1", "1.0.0"), -1);
  assert.equal(compareVersions("1.0.0", "1.0.0-rc.1"), 1);
  assert.equal(compareVersions("1.0.0-rc.1", "1.0.0-rc.2"), -1);
  assert.equal(compareVersions("2.0.0-beta", "2.0.0-beta"), 0);
  assert.throws(() => compareVersions("1.x.0", "1.0.0"), TypeError);
  assert.throws(() => compareVersions("1.0.0", "1.2.5.1a"), TypeError);
});
test("parseQuery", async () => {
  const { parseQuery } = await load("query");
  assert.deepEqual(parseQuery("?a=1&b=2&a=3"), { a: ["1", "3"], b: "2" });
  assert.deepEqual(parseQuery("x=a+b&y=%C3%A9&flag"), {
    x: "a b",
    y: "\u00e9",
    flag: "",
  });
  assert.deepEqual(parseQuery("k=1&k=2&k=3"), { k: ["1", "2", "3"] });
  assert.deepEqual(parseQuery("a%20b=c%26d"), { "a b": "c&d" });
  assert.deepEqual(parseQuery(""), {});
  assert.deepEqual(parseQuery("?"), {});
});
test("wrap", async () => {
  const { wrap } = await load("wrap");
  assert.equal(wrap("aaa bbb ccc", 7), "aaa bbb\nccc");
  assert.equal(wrap("aaa  bbb   ccc", 3), "aaa\nbbb\nccc");
  assert.equal(wrap("a verylongword b", 4), "a\nverylongword\nb");
  assert.equal(wrap("ab cd", 5), "ab cd");
  assert.equal(wrap("", 5), "");
});
test("dedent", async () => {
  const { dedent } = await load("dedent");
  assert.equal(dedent("  a\n    b\n  c"), "a\n  b\nc");
  assert.equal(dedent("    a\n  \n  b\n"), "  a\n\nb\n");
  assert.equal(dedent("a\n  b"), "a\n  b");
  assert.equal(dedent(""), "");
});
