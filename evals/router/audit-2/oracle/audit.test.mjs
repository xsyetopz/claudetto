import assert from "node:assert";
import fs from "node:fs";
import { test } from "node:test";

// The functions of the fixture.
const NAMES = [
  "findUser",
  "getUser",
  "searchUsers",
  "setRole",
  "sortUsers",
  "checkPassword",
  "resetToken",
  "sessionId",
  "renderProfile",
  "profileUrl",
  "afterLogin",
  "loginUser",
  "checkToken",
  "bulkLoad",
  "pageUsers",
];

/**
 * The text of AUDIT.md by the function name that starts each entry.
 * A line that starts with no function name continues the entry above it,
 * so a heading or a second sentence on its own line names no function.
 */
function byName() {
  const out = new Map();
  let name;
  for (const line of fs.readFileSync("AUDIT.md", "utf8").split("\n")) {
    const m = line.match(/^\W*(\w+)\W?(.*)$/);
    if (m && NAMES.includes(m[1])) name = m[1];
    if (name) out.set(name, `${out.get(name) ?? ""} ${line}`);
  }
  return out;
}

test("AUDIT.md names the six flaws and no sound function", () => {
  const r = byName();
  assert.match(
    r.get("sortUsers") ?? "",
    /injection|sql|column|identifier|order by|concatenat|interpolat|allow/i,
  );
  assert.match(
    r.get("resetToken") ?? "",
    /random|predict|crypto|guess|entropy|secure/i,
  );
  assert.match(
    r.get("renderProfile") ?? "",
    /xss|cross.?site|escap|html|inject|sanitiz|script/i,
  );
  assert.match(
    r.get("afterLogin") ?? "",
    /redirect|\/\/|protocol.?relative|external|open|allow|startsWith|evil|host/i,
  );
  assert.match(
    r.get("loginUser") ?? "",
    /enumerat|distinguish|differ|reveal|leak|exist|message|which/i,
  );
  assert.match(
    r.get("checkToken") ?? "",
    /timing|constant.?time|timingSafeEqual|side.?channel|compare|===/i,
  );
  // `searchUsers` and `setRole` may be listed or left out, because the `LIKE` wildcards and the role with no allowlist are defensible findings.
  for (const f of [
    "findUser",
    "getUser",
    "checkPassword",
    "sessionId",
    "profileUrl",
    "bulkLoad",
    "pageUsers",
  ])
    assert.ok(!r.has(f), f);
});
