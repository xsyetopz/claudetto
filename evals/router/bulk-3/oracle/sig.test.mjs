import assert from "node:assert";
import fs from "node:fs";
import { test } from "node:test";
import * as idx from "../src/index.mjs";
import * as circle from "../src/circle.mjs";
import { area, areaOf, perimeter, rectArea } from "../src/shape.mjs";

test("new signature", () => assert.equal(area({ w: 3, h: 4 }), 12));
test("the old name is the same function", () =>
  assert.equal(rectArea({ w: 2, h: 5 }), 10));
test("other functions keep their form", () => {
  assert.equal(perimeter(2, 3), 10);
  assert.equal(areaOf({ w: 2, h: 5 }), 10);
  assert.match(fs.readFileSync("src/mod5.mjs", "utf8"), /area = \(r\)/);
  assert.match(fs.readFileSync("src/mod5.mjs", "utf8"), /area\(5\)/);
  assert.equal(circle.area(2), 13);
  assert.match(fs.readFileSync("src/mod8.mjs", "utf8"), /area\(2, 3\)/);
});
test("callers work", () => {
  assert.equal(idx.a1(), 2);
  assert.deepEqual(idx.a2(), [6, 20]);
  assert.equal(idx.a3(), 24);
  assert.equal(idx.a4(), 38);
  assert.equal(idx.a5(), 79);
  assert.equal(idx.a6(), 42);
  assert.equal(idx.a7(3, 5), 15);
  assert.equal(idx.a8(), 12);
  assert.equal(idx.a9(), 72);
  assert.equal(idx.a10(), 110);
  assert.equal(idx.a11(), 132);
  assert.deepEqual(idx.a12(), [2, 12]);
  assert.equal(idx.total12(), 14);
  assert.equal(idx.a13(), 38);
  assert.equal(idx.a14(), 28);
  assert.equal(idx.a15(), 31);
  assert.equal(idx.a16(), "area(3, 4) = 12");
  assert.equal(idx.a17(), 34);
  assert.equal(idx.a18(), 45);
});
