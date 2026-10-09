import assert from "node:assert";
import fs from "node:fs";
import { test } from "node:test";

// The functions of the fixture.
const NAMES = [
  "resolveInside",
  "readUpload",
  "saveUpload",
  "uploadSize",
  "deleteUpload",
  "copyUpload",
  "extractUpload",
  "contentDisposition",
  "isImage",
  "listUploads",
  "moveUpload",
  "tempPath",
  "relativeName",
  "uploadUrl",
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
    r.get("readUpload") ?? "",
    /decod|%2e|percent|encod|after the check|URI/i,
  );
  assert.match(
    r.get("saveUpload") ?? "",
    /prefix|startsWith|separator|sibling|uploads-|trailing slash|boundary/i,
  );
  assert.match(
    r.get("extractUpload") ?? "",
    /zip.?slip|traversal|\.\.|outside|escape|resolve|not checked|no check|unchecked|validat|sanitiz|archive/i,
  );
  assert.match(
    r.get("contentDisposition") ?? "",
    /header|quote|inject|newline|crlf|\\r|\\n|split|escap|sanitiz|encod/i,
  );
  assert.match(
    r.get("moveUpload") ?? "",
    /second|destination|\bto\b|unchecked|not checked|no check|outside|traversal|\.\.|resolveInside|target/i,
  );
  assert.match(
    r.get("tempPath") ?? "",
    /predict|guess|Date|time|random|tmp|temp|race|symlink/i,
  );
  // `uploadSize` may be listed or left out, because `..` reaches the size of `/srv`.
  // `copyUpload` and `resolveInside` may be listed or left out, because they follow a link inside the folder.
  for (const f of ["deleteUpload", "isImage", "listUploads", "relativeName", "uploadUrl"])
    assert.ok(!r.has(f), f);
});
