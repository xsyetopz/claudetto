import assert from "node:assert";
import { test } from "node:test";
import { slugify, title } from "../src/text.mjs";

test("slugify", () => {
  assert.equal(slugify("Hello, World!"), "hello-world");
  assert.equal(slugify("  a  b "), "a-b");
});
test("title still works", () => {
  assert.equal(title("a b"), "A B");
});
