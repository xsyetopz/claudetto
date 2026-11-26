#!/usr/bin/env bash
# Scaffold: two small Python modules (py/slugify.py, py/wordwrap.py) and their frozen Bun tests in
# ts/. Each port is done when `bun test ts/<name>.test.ts` passes; PORTING.md says so, and a bare
# "port py/slugify.py" brief leaves the target path and that check out. Offline and deterministic.
set -euo pipefail

mkdir -p py ts
cat > package.json <<'JSON'
{
  "name": "port-demo",
  "private": true,
  "type": "module",
  "scripts": { "test": "bun test" }
}
JSON
cat > PORTING.md <<'MD'
# Porting py/ to ts/

Each module in `py/<name>.py` moves to `ts/<name>.ts`, keeping its behavior and its function name.
The tests in `ts/<name>.test.ts` are frozen. A port is done when `bun test ts/<name>.test.ts` passes.
MD
cat > py/slugify.py <<'PY'
import re


def slugify(text):
    """Lowercase, runs of non-alphanumerics become one dash, no dash at either end."""
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
PY
cat > py/wordwrap.py <<'PY'
def wordwrap(text, width):
    """Greedy wrap at spaces; a word longer than width stays on its own line."""
    lines = []
    line = ""
    for word in text.split():
        if line and len(line) + 1 + len(word) > width:
            lines.append(line)
            line = word
        else:
            line = f"{line} {word}" if line else word
    if line:
        lines.append(line)
    return "\n".join(lines)
PY
cat > ts/slugify.test.ts <<'TS'
import { expect, test } from "bun:test";
import { slugify } from "./slugify";

test("lowercases and dashes", () => {
	expect(slugify("Hello, World!")).toBe("hello-world");
});

test("trims dashes at both ends", () => {
	expect(slugify("  --Already Slugged--  ")).toBe("already-slugged");
});

test("collapses runs of punctuation", () => {
	expect(slugify("a___b...c")).toBe("a-b-c");
});
TS
cat > ts/wordwrap.test.ts <<'TS'
import { expect, test } from "bun:test";
import { wordwrap } from "./wordwrap";

test("wraps greedily at the width", () => {
	expect(wordwrap("the quick brown fox", 9)).toBe("the quick\nbrown fox");
});

test("keeps a long word on its own line", () => {
	expect(wordwrap("a extraordinarily b", 5)).toBe("a\nextraordinarily\nb");
});

test("empty text gives an empty string", () => {
	expect(wordwrap("   ", 10)).toBe("");
});
TS
