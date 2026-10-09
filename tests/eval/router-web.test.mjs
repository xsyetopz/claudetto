// Fixture runs of the router `web-*` cases (task 11.12).
// Each case has a second requirement that the doc of the vendor file makes possible and a quick run skips.

import { expect, test } from "bun:test";
import { resolves, writes } from "./router-case.mjs";

const TITLE = `import { slug } from "../vendor/slugger.mjs";

const STRIP = /\\.(?!\\d)|(?<!\\d)\\.|[^a-z0-9\\s.]/g;
const BASE = { ł: "l", ø: "o", đ: "d", ß: "ss" };

export function urlName(title) {
  const text = title
    .toLowerCase()
    .replace(/[łøđß]/g, (c) => BASE[c])
    .replace(/&/g, " and ")
    .replace(/[-_]/g, " ");
  return slug(text, {
    joiner: "-",
    ascii: true,
    limit: 20,
    strip: STRIP,
  });
}
`;

const title = (text) => writes({ "src/title.mjs": text });

test("web-1: the name with `and`, kept digit dots, and a strip with `g` is resolved", async () => {
  expect(await resolves("web-1", title(TITLE))).toBe(true);
});

for (const [why, text] of [
  [
    "a name that leaves `&` to the default strip",
    TITLE.replace('.replace(/&/g, " and ")', ""),
  ],
  [
    "a name that trusts the 1.5 page for `ascii` and maps no `ł`, `ø`, `đ`, or `ß`",
    TITLE.replace(".replace(/[łøđß]/g, (c) => BASE[c])", ""),
  ],
  [
    "a name that drops a hyphen or an underscore and joins the words",
    TITLE.replace('\n    .replace(/[-_]/g, " ")', ""),
  ],
  [
    "a name with the default strip, which drops each dot",
    TITLE.replace("strip: STRIP,", ""),
  ],
  [
    "a strip with no `g` flag",
    TITLE.replace("[^a-z0-9\\s.]/g", "[^a-z0-9\\s.]/"),
  ],
  [
    "an option of slugger 1.5, which the installed 1.3.0 ignores",
    TITLE.replace(
      "const STRIP = /\\.(?!\\d)|(?<!\\d)\\.|[^a-z0-9\\s.]/g;\n",
      "",
    ).replace("strip: STRIP,", 'keepDots: true,\n    amp: "and",'),
  ],
  [
    "a name that keeps each dot",
    TITLE.replace(/const STRIP = .*;/, "const STRIP = /[^a-z0-9\\s.]/g;"),
  ],
])
  test(`web-1: ${why} is not resolved`, async () => {
    expect(await resolves("web-1", title(text))).toBe(false);
  });

const MEMO = `import { LruBox } from "../vendor/lrubox.mjs";

export function memoLast(fn, max) {
  if (!Number.isInteger(max) || max < 1) throw new RangeError("bad max");
  let box = new LruBox({ max });
  let keys = new Map();
  const touch = (x) => {
    keys.delete(x);
    keys.set(x, true);
    if (keys.size > max) keys.delete(keys.keys().next().value);
  };
  const memo = (x) => {
    const hit = box.fetch(x);
    if (hit) {
      touch(x);
      return hit.value;
    }
    const value = fn(x);
    box.put(x, { value });
    touch(x);
    return value;
  };
  memo.clear = () => {
    box = new LruBox({ max });
    keys = new Map();
  };
  memo.size = () => keys.size;
  return memo;
}
`;

const memo = (text) => writes({ "src/memo.mjs": text });

test("web-2: a cache that wraps each result and has `clear` is resolved", async () => {
  expect(await resolves("web-2", memo(MEMO))).toBe(true);
});

for (const [why, text] of [
  [
    "a cache that takes `undefined` for a miss",
    MEMO.replace(
      "if (hit) return hit.value;",
      "if (hit !== undefined) return hit.value;",
    )
      .replace("{ value }", "value")
      .replace("hit.value", "hit"),
  ],
  [
    "a cache that calls `box.has` and `box.clear` of lrubox 1.2, which the installed 1.0.1 lacks",
    MEMO.replace(
      "const hit = box.fetch(x);\n    if (hit) {",
      "const hit = box.has(x) && { value: box.fetch(x) };\n    if (hit) {",
    )
      .replace("box.put(x, { value })", "box.put(x, value)")
      .replace(
        "box = new LruBox({ max });\n    keys",
        "box.clear();\n    keys",
      ),
  ],
  [
    "a `size` that calls `box.size()` of lrubox 1.2, which the installed 1.0.1 lacks",
    MEMO.replace(
      "memo.size = () => keys.size;",
      "memo.size = () => box.size();",
    ),
  ],
  [
    "a cache that has no `size`",
    MEMO.replace("  memo.size = () => keys.size;\n", ""),
  ],
  [
    "a cache that accepts a `max` of 0, as lrubox 1.0.1 does",
    MEMO.replace(/ {2}if \(!Number[^\n]*\n/, ""),
  ],
  [
    "a cache that has no `clear`",
    MEMO.replace(/ {2}memo\.clear[\s\S]*?\};\n/, ""),
  ],
  [
    "a cache that does not use the box",
    MEMO.replace(/import .*\n/, "")
      .replace(/new LruBox\(\{ max \}\)/g, "new Map()")
      .replace("box.fetch(x)", "box.get(x) && { value: box.get(x).value }")
      .replace("box.put(x, { value })", "box.set(x, { value })"),
  ],
])
  test(`web-2: ${why} is not resolved`, async () => {
    expect(await resolves("web-2", memo(text))).toBe(false);
  });

const SHARD = `import { chunk } from "../vendor/chunkit.mjs";

const list = (items) => Array.from(items);

function check(n) {
  if (!Number.isInteger(n) || n < 1) throw new RangeError("bad count");
}

export function shard(input, parts = 3) {
  check(parts);
  const items = list(input);
  if (items.length === 0) return [];
  return chunk(items, { parts: Math.min(parts, items.length), extra: "last" });
}

export function shardBy(input, size) {
  check(size);
  const items = list(input);
  if (items.length === 0) return [];
  return chunk(items, { parts: Math.ceil(items.length / size), extra: "last" });
}
`;

const shard = (text) => writes({ "src/shard.mjs": text });

test("web-3: both functions, with the check before the empty list, are resolved", async () => {
  expect(await resolves("web-3", shard(SHARD))).toBe(true);
});

for (const [why, text] of [
  [
    "a `shard` that returns for an empty list before the check",
    SHARD.replace(
      "  check(parts);\n  const items = list(input);\n  if (items.length === 0) return [];",
      "  const items = list(input);\n  if (items.length === 0) return [];\n  check(parts);",
    ),
  ],
  [
    "a file with no `shardBy`",
    SHARD.replace(/\nexport function shardBy[\s\S]*$/, ""),
  ],
  [
    "a `shard` that reads `length` of a `Set`, which chunkit 1.1.0 needs and a `Set` lacks",
    SHARD.replace(
      "const list = (items) => Array.from(items);",
      "const list = (items) => items;",
    ),
  ],
  [
    "a `shardBy` that uses `size` of chunkit 1.3, which the installed 1.1.0 ignores",
    SHARD.replace(
      'chunk(items, { parts: Math.ceil(items.length / size), extra: "last" })',
      'chunk(items, { size, extra: "last" })',
    ),
  ],
  [
    "a `shard` that relies on `parts` above the item count, which 1.3 allows and 1.1.0 rejects",
    SHARD.replace("parts: Math.min(parts, items.length)", "parts"),
  ],
  [
    "a `shardBy` that gives the extra items to the first parts",
    SHARD.replace(
      'parts: Math.ceil(items.length / size), extra: "last"',
      "parts: Math.ceil(items.length / size)",
    ),
  ],
])
  test(`web-3: ${why} is not resolved`, async () => {
    expect(await resolves("web-3", shard(text))).toBe(false);
  });
