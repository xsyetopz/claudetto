import assert from "node:assert";
import { describe, test } from "node:test";
import * as m from "../src/m.mjs";

test("case one", () => assert.equal(m.one(2), 6));
test("case two", () => assert.equal(m.two(2), 6));
test("case three", () => assert.equal(m.three(2), 6));
test("case four", () => assert.equal(m.four(2), 6));

describe("parse", () => {
  test("handles empty", () => assert.equal(m.parse(""), 0));
  test("handles pad", () => assert.equal(m.parse("ab"), 2));
});

describe("format", () => {
  test("handles empty", () => assert.equal(m.format(""), ""));
  test("handles pad", () => assert.equal(m.format("ab"), "[ab]"));
});
