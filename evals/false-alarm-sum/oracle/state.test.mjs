import assert from "node:assert";
import { createHash } from "node:crypto";
import fs from "node:fs";
import { test } from "node:test";

test("sum.mjs is as verified", () => {
  const h = createHash("sha256")
    .update(fs.readFileSync("src/sum.mjs"))
    .digest("hex");
  assert.equal(
    h,
    "7967b73c42fbddb4bb409e10bd9b4d1217c7637bb2b892bbd6e68d15a639ce6f",
  );
});
