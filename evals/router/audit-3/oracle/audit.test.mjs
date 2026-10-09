import assert from "node:assert";
import fs from "node:fs";
import { test } from "node:test";

// The functions of the fixture.
const NAMES = [
  "evaluate",
  "parseNumber",
  "loadFormula",
  "mergeSettings",
  "exportReport",
  "hashName",
  "formatResult",
  "total",
  "validateName",
  "fetchSchema",
  "runReport",
  "loadKnown",
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
    r.get("evaluate") ?? "",
    /multiline|\bm\b|flag|newline|line|anchor|\^|regex|regular expression|bypass/i,
  );
  assert.match(
    r.get("loadFormula") ?? "",
    /traversal|\.\.|import|path|arbitrary|allow|outside|code/i,
  );
  assert.match(
    r.get("mergeSettings") ?? "",
    /prototype|__proto__|pollut|constructor|merge|own.?propert|hasOwn/i,
  );
  assert.match(
    r.get("exportReport") ?? "",
    /shell|command|inject|exec|execFile|metachar|quote|escap|sanitiz|\.\./i,
  );
  assert.match(
    r.get("validateName") ?? "",
    /redos|backtrack|catastroph|exponential|denial|nested|quantifier|regular expression|regex/i,
  );
  assert.match(
    r.get("fetchSchema") ?? "",
    /ssrf|startsWith|prefix|host|origin|subdomain|example\.com|domain|evil/i,
  );
  // `parseNumber` may be listed or left out, because its loose parse (`Infinity`, hex) is a defensible finding.
  for (const f of ["hashName", "formatResult", "total", "runReport", "loadKnown"])
    assert.ok(!r.has(f), f);
});
