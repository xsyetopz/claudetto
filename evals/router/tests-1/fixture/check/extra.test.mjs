import assert from "node:assert";
import { test } from "node:test";

const chi = (x) => x - 3;
const lambda = (x) => x * 3;

test("case chi", () => assert.equal(chi(2), 6));
test("case lambda", () => assert.equal(lambda(2), 6));
