// Fixture runs of the router `bulk-*` cases (task 11.12).
// Each case has sites that a plain text replace in the `.mjs` files misses or breaks.

import { expect, test } from "bun:test";
import { edits, resolves, rewriteAll } from "./router-case.mjs";

const rename = (re, to, { only = () => true } = {}) =>
  rewriteAll((text, rel) => (only(rel) ? text.replace(re, to) : text));
const mjs = (rel) => rel.endsWith(".mjs");

const NAME = /(?<![\w$])fetchUser(?![\w$])/g;
const notGenerated = (rel) => !rel.endsWith(".gen.mjs");
const bulk1 = (
  name = NAME,
  { only = notGenerated, anchor = true, verb = true } = {},
) =>
  rewriteAll((text, rel) => {
    if (!only(rel)) return text;
    let next = text.replace(name, "loadUser");
    if (anchor) next = next.replace("#fetchuser", "#loaduser");
    if (verb)
      next = next.replace('const verb = "fetch"', 'const verb = "load"');
    return next;
  });

test("bulk-1: a rename that keeps `$` names, the generated file, the anchor, and the built name is resolved", async () => {
  expect(await resolves("bulk-1", bulk1())).toBe(true);
});

for (const [why, act] of [
  [
    "a rename in the `.mjs` files only",
    bulk1(NAME, { only: (rel) => notGenerated(rel) && mjs(rel) }),
  ],
  ["a rename with no word boundary", bulk1(/fetchUser/g)],
  [
    "a rename with `\\b`, which takes `$fetchUser` and `fetchUser$`",
    bulk1(/\bfetchUser\b/g),
  ],
  [
    "a rename that also changes the generated file",
    bulk1(NAME, { only: () => true }),
  ],
  [
    "a rename that leaves the link target of the guide",
    bulk1(NAME, { anchor: false }),
  ],
  [
    "a rename that leaves the name that a file builds from two strings",
    bulk1(NAME, { verb: false }),
  ],
  [
    "a rename in the top folder only",
    bulk1(NAME, { only: (rel) => rel.split("/").length === 2 }),
  ],
])
  test(`bulk-1: ${why} is not resolved`, async () => {
    expect(await resolves("bulk-1", act)).toBe(false);
  });

const KEY = /(?<![A-Za-z_])timeout_ms(?![A-Za-z_0-9])/g;
const key = (only = () => true) =>
  rename(KEY, "timeoutMs", { only: (rel) => notGenerated(rel) && only(rel) });

test("bulk-2: a rename of the key in every file but the generated one, also the hidden and data files, is resolved", async () => {
  expect(await resolves("bulk-2", key())).toBe(true);
});

for (const [why, act] of [
  [
    "a rename that takes `connect_timeout_ms` too",
    rename(/timeout_ms(?![A-Za-z_0-9])/g, "timeoutMs", { only: notGenerated }),
  ],
  [
    "a rename that takes `timeout_ms_max` too",
    rename(/(?<![A-Za-z_])timeout_ms/g, "timeoutMs", { only: notGenerated }),
  ],
  ["a rename that also changes the generated file", rename(KEY, "timeoutMs")],
  [
    "a rename that skips the hidden file, as `rg` does",
    key((rel) => !rel.split("/").some((p) => p.startsWith("."))),
  ],
  ["a rename in the `.mjs` files only", key(mjs)],
  [
    "a rename of the property accesses only",
    rename(/\.timeout_ms/g, ".timeoutMs", { only: notGenerated }),
  ],
  [
    "a rename in the top folder only",
    key((rel) => rel.split("/").length === 2),
  ],
])
  test(`bulk-2: ${why} is not resolved`, async () => {
    expect(await resolves("bulk-2", act)).toBe(false);
  });

const SHAPE = [
  ["src/shape.mjs", "area = (w, h) => w * h", "area = ({ w, h }) => w * h"],
  [
    "src/shape.mjs",
    "area(shape.w, shape.h)",
    "area({ w: shape.w, h: shape.h })",
  ],
];
const PLAIN = [
  ["src/mod1.mjs", "area(1, 2)", "area({ w: 1, h: 2 })"],
  ["src/mod2.mjs", "area(w, h)", "area({ w, h })"],
  [
    "src/mod3.mjs",
    "area(side() + 1, side() * 2)",
    "area({ w: side() + 1, h: side() * 2 })",
  ],
  ["src/mod4.mjs", "area(4, 5)", "area({ w: 4, h: 5 })"],
  ["src/mod6.mjs", "rect(6, 7)", "rect({ w: 6, h: 7 })"],
  ["src/mod7.mjs", "shape.area(w, h)", "shape.area({ w, h })"],
  ["src/report/mod12.mjs", "area(r.w, r.h)", "area({ w: r.w, h: r.h })"],
];
const SPREAD = [
  ["src/mod9.mjs", "area(...DIMS)", "area({ w: DIMS[0], h: DIMS[1] })"],
];
const STORED = [["src/mod10.mjs", "calc(10, 11)", "calc({ w: 10, h: 11 })"]];
const ALIAS = [
  ["src/report/mod11.mjs", "rectArea(11, 12)", "rectArea({ w: 11, h: 12 })"],
];
const INDIRECT = [
  [
    "src/mod13.mjs",
    "area.call(null, 13, 2) + area.apply(null, [3, 4])",
    "area.call(null, { w: 13, h: 2 }) + area.apply(null, [{ w: 3, h: 4 }])",
  ],
  [
    "src/mod14.mjs",
    "    14, // the width\n    2, // the height",
    "    { w: 14, h: 2 },",
  ],
  ["src/mod15.mjs", "both(area, 3, 5)", "both((w, h) => area({ w, h }), 3, 5)"],
];
const TEXT = [["src/mod16.mjs", "${area(3, 4)}", "${area({ w: 3, h: 4 })}"]];
const CHAIN = [
  ["src/mod17.mjs", "shapeArea(17, 2)", "shapeArea({ w: 17, h: 2 })"],
  [
    "src/mod18.mjs",
    "calc(18, 2) + ops.area(3, 3)",
    "calc({ w: 18, h: 2 }) + ops.area({ w: 3, h: 3 })",
  ],
];
const ALL = [
  ...SHAPE,
  ...PLAIN,
  ...SPREAD,
  ...STORED,
  ...ALIAS,
  ...INDIRECT,
  ...TEXT,
  ...CHAIN,
];

test("bulk-3: every caller, also the spread, the stored reference, and the alias, is resolved", async () => {
  expect(await resolves("bulk-3", edits(ALL))).toBe(true);
});

const without = (drop) => ALL.filter((e) => !drop.includes(e));

for (const [why, list] of [
  ["a change that skips the spread call", without(SPREAD)],
  ["a change that skips the stored reference", without(STORED)],
  ["a change that skips the caller of the alias", without(ALIAS)],
  ["a change that skips `call` and `apply`", without([INDIRECT[0]])],
  ["a change that skips the call with comments inside", without([INDIRECT[1]])],
  [
    "a change that skips the function that gets `area` as an argument",
    without([INDIRECT[2]]),
  ],
  ["a change that skips the re-export under a new name", without([CHAIN[0]])],
  [
    "a change that skips the destructured and stored `area`",
    without([CHAIN[1]]),
  ],
  ["a change that skips the call in the template", without(TEXT)],
  [
    "a change that also turns the text that looks like a call",
    [...without(TEXT), ["src/mod16.mjs", "area(3, 4)", "area({ w: 3, h: 4 })"]],
  ],
  [
    "a change that also turns the `area` of the circle code",
    [...ALL, ["src/mod8.mjs", "area(2, 3)", "area({ w: 2, h: 3 })"]],
  ],
])
  test(`bulk-3: ${why} is not resolved`, async () => {
    expect(await resolves("bulk-3", edits(list))).toBe(false);
  });
