import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import * as idx from "../src/index.mjs";

const files = (d) =>
  fs
    .readdirSync(d, { withFileTypes: true })
    .flatMap((e) =>
      e.isDirectory() ? files(path.join(d, e.name)) : [path.join(d, e.name)],
    );
const read = (f) => fs.readFileSync(f, "utf8");

// A longer key, such as `connect_timeout_ms` or `timeout_ms_max`, is another key.
const OLD = /(?<![A-Za-z_])timeout_ms(?![A-Za-z_0-9])/;
const GENERATED = "src/gen/schema.gen.mjs";

test("no old key in any file but the generated one", () => {
  for (const f of files("src"))
    if (f !== GENERATED) assert.ok(!OLD.test(read(f)), f);
});
test("the generated file is not changed", () => {
  assert.match(read(GENERATED), /\["timeout_ms", "connect_timeout_ms"\]/);
});
test("the other keys stay", () => {
  assert.match(read("src/config.mjs"), /connect_timeout_ms: 50/);
  assert.match(read("src/defaults.json"), /"connect_timeout_ms"/);
  assert.match(read("src/README.md"), /`TIMEOUT_MS`/);
  assert.match(read("src/README.md"), /`connect_timeout_ms`/);
  assert.match(read("src/config.mjs"), /timeout_ms_max: 900/);
  assert.match(read("src/config.yaml"), /^connect_timeout_ms: 50$/m);
});
test("the data file and the notes follow the rename", () => {
  const d = JSON.parse(read("src/defaults.json"));
  assert.deepEqual(d, { timeoutMs: 500, connect_timeout_ms: 50 });
  assert.match(read("src/README.md"), /`timeoutMs`/);
  assert.match(read("src/config.yaml"), /^timeoutMs: 500$/m);
  assert.match(read("src/config.yaml"), /^ {2}timeoutMs: 700$/m);
  assert.deepEqual(JSON.parse(read("src/.local.json")), { timeoutMs: 1000 });
});
test("behavior kept", () => {
  assert.equal(idx.t1(), 501);
  assert.equal(idx.t2(), 502);
  assert.equal(idx.t3(), 503);
  assert.equal(idx.t4(), 504);
  assert.equal(idx.t5(), 505);
  assert.equal(idx.t6(), 506);
  assert.equal(idx.t7(), 707);
  assert.equal(idx.c7(), 57);
  assert.equal(idx.t8(), 508);
  delete process.env.TIMEOUT_MS;
  assert.equal(idx.t9(), 1509);
  assert.equal(idx.t10(), 560);
  assert.deepEqual(idx.t11(), { timeoutMs: 511, label: "timeoutMs=511" });
  assert.equal(idx.t12(), 512);
  assert.equal(idx.m12(), 900);
});
