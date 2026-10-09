import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import * as idx from "../src/index.mjs";
import * as lib from "../src/lib.mjs";

const files = (d) =>
  fs
    .readdirSync(d, { withFileTypes: true })
    .flatMap((e) =>
      e.isDirectory() ? files(path.join(d, e.name)) : [path.join(d, e.name)],
    );
const read = (f) => fs.readFileSync(f, "utf8");

// `$` is part of a name, so `$fetchUser` and `fetchUser$` are other names.
const OLD = /(?<![\w$])fetchUser(?![\w$])/;
const GENERATED = "src/gen/api.gen.mjs";

test("no old name in any file but the generated one", () => {
  for (const f of files("src"))
    if (f !== GENERATED) assert.ok(!OLD.test(read(f)), f);
});
test("the generated file is not changed", () => {
  assert.match(read(GENERATED), /\["fetchUser", "fetchUsers", "ping"\]/);
});
test("other names stay", () => {
  assert.deepEqual(Object.keys(lib).sort(), [
    "fetchUserCache",
    "fetchUsers",
    "loadUser",
    "prefetchUser",
    "refetchUser",
  ]);
  assert.match(read("src/mod4.mjs"), /fetchUserCache/);
  assert.match(read("src/mod6.mjs"), /prefetchUser/);
  assert.match(read("src/mod10.mjs"), /refetchUser/);
  assert.match(read("src/deep/deeper/mod13.mjs"), /fetchUsers/);
  assert.match(read("src/deep/NOTES.md"), /fetchUsers\(\)/);
  assert.match(read("src/mod14.mjs"), /\$fetchUser/);
  assert.match(read("src/mod14.mjs"), /fetchUser\$/);
  assert.match(read("src/lib.d.mts"), /fetchUserCache/);
});
test("the notes and the route table follow the rename", () => {
  assert.match(read("src/NOTES.md"), /`loadUser`/);
  assert.match(read("src/deep/NOTES.md"), /`loadUser\(\)`/);
  const guide = read("src/deep/GUIDE.md");
  assert.match(guide, /\[loadUser\]\(#loaduser\)/);
  assert.match(guide, /^## loadUser$/m);
  assert.match(guide, /import \{ loadUser \}/);
  assert.match(read("src/lib.d.mts"), /function loadUser\(/);
  const routes = JSON.parse(read("src/routes.json"));
  assert.deepEqual(routes, { user: "loadUser", cache: "fetchUserCache" });
});
test("behavior kept", () => {
  assert.equal(lib.loadUser(2), "user-2");
  assert.deepEqual(lib.fetchUsers([1, 2]), ["user-1", "user-2"]);
  assert.deepEqual(
    [2, 3, 4, 5, 6, 7, 9, 10, 12, 13, 14, 15, 16].map((n) => idx[`u${n}`]()),
    [
      "user-2",
      "user-3",
      "user-4/cache-4",
      "user-5",
      "pre-6",
      "user-7",
      "user-9",
      "user-10/re-10",
      "user-12",
      "user-13",
      "user-14",
      "user-15+1",
      "user-16",
    ],
  );
  assert.deepEqual(idx.list13(), ["user-13", "user-14"]);
  assert.equal(idx.user8(8), "user-8");
});
