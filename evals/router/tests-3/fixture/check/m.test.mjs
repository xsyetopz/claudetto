import assert from "node:assert";
import { test } from "node:test";
import * as m from "../src/m.mjs";

// Each row is a test. A name that is not a function gives a TypeError.
const NAMES = [
  "red",
  "green",
  "blue",
  "cyan",
  "pink",
  "gray",
  "teal",
  "navy",
  "lime",
  "plum",
  "gold",
  "ruby",
  "jade",
  "onyx",
  "rose",
  "sand",
  "rust",
  "mint",
  "ivory",
  "coral",
  "amber",
  "olive",
  "azure",
  "taupe",
];

for (const name of NAMES)
  test(`case ${name}`, async () => assert.equal(await m[name](2), 6));
