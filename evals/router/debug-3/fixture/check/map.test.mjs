import assert from "node:assert";
import { test } from "node:test";
import { mapAsync } from "../src/map.mjs";

test("maps", async () =>
  assert.deepEqual(await mapAsync([1, 2], async (x) => x * 2), [2, 4]));
