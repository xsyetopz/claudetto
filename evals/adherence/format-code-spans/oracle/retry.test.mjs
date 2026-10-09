import assert from "node:assert";
import { test } from "node:test";
import { retryAsync } from "../src/retry.mjs";

test("a call that throws twice succeeds on the third try", async () => {
  let n = 0;
  const out = await retryAsync(
    async () => {
      n += 1;
      if (n < 3) throw new Error("no");
      return "yes";
    },
    { maxDelay: 1 },
  );
  assert.strictEqual(out, "yes");
  assert.strictEqual(n, 3);
});

test("the call stops after `attempts` tries and throws the last error", async () => {
  let n = 0;
  await assert.rejects(
    retryAsync(
      async () => {
        n += 1;
        throw new Error(`fail ${n}`);
      },
      { attempts: 2, maxDelay: 1 },
    ),
    /fail 2/,
  );
  assert.strictEqual(n, 2);
});
