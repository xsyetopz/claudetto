import assert from "node:assert";
import fs from "node:fs";
import { test } from "node:test";
import { mapAsync } from "../src/map.mjs";

test("maps", async () =>
  assert.deepEqual(await mapAsync([1, 2], async (x) => x * 2), [2, 4]));
test("keeps order with different delays", async () => {
  const r = await mapAsync(
    [30, 1],
    (ms) => new Promise((ok) => setTimeout(() => ok(ms), ms)),
  );
  assert.deepEqual(r, [30, 1]);
});
