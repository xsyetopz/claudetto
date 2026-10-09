import assert from "node:assert";
import { createHash } from "node:crypto";
import fs from "node:fs";
import { test } from "node:test";

test("mean.mjs is as verified", () => {
  const h = createHash("sha256")
    .update(fs.readFileSync("src/mean.mjs"))
    .digest("hex");
  assert.equal(
    h,
    "a63ab9cab210876a3d519cfddb047b4e5deebf37c59e25d68ac2cb35dc0f6929",
  );
});
