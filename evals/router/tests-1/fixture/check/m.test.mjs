import assert from "node:assert";
import { describe, test } from "node:test";
import * as m from "../src/m.mjs";

test("case alpha", () => assert.equal(m.alpha(2), 6));
test("case beta", () => assert.equal(m.beta(2), 6));
test("case gamma", () => assert.equal(m.gamma(2), 6));
test("case delta", () => assert.equal(m.delta(2), 6));
test("case eps", () => assert.equal(m.eps(2), 6));

describe("edges", () => {
  test("case omega", () => assert.equal(m.omega(2), 6));
  test("case sigma", () => assert.equal(m.sigma(2), 6));
  // Skipped until the rounding change lands.
  test("case tau", { skip: true }, () => assert.equal(m.tau(2), 6));
});

test("case phi", () => assert.equal(m.phi(2), 6));
test("case psi", async () => assert.equal(await m.psi(2), 6));

for (const n of [1, 2, 3, 4])
  test(`row ${n}`, () => assert.equal(m.row(n), n * 3));
