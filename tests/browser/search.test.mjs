// dotclaude-browser: the pure parts of the web search.

import assert from "node:assert/strict";
import { test } from "node:test";
import {
  MAX_OUTPUT_CHARS,
  SESSION_NAME_MAX,
  SESSION_PREFIX,
} from "../../plugins/dotclaude-browser/features/search/limits.mjs";
import {
  failure,
  pageResult,
  searchQuery,
  searchResult,
  searchUrl,
  sessionName,
  steps,
} from "../../plugins/dotclaude-browser/features/search/search.mjs";

test("the query takes the domain filters as search terms", () => {
  assert.equal(
    searchQuery({
      query: " bun ",
      allowed_domains: ["bun.sh", "x y"],
      blocked_domains: ["a.com"],
    }),
    "bun site:bun.sh -site:a.com",
  );
  assert.equal(searchQuery({ query: "" }), null);
  assert.equal(searchQuery(undefined), null);
});

test("the URL encodes the query", () => {
  assert.equal(
    searchUrl("a&b c"),
    "https://html.duckduckgo.com/html/?q=a%26b%20c",
  );
});

test("the steps run in an own session and bound the output", () => {
  const s = steps("https://x.test", "dotclaude-websearch-1");
  assert.deepEqual(s.open.slice(-2), ["open", "https://x.test"]);
  assert.ok(s.read.includes(String(MAX_OUTPUT_CHARS)), s.read);
  for (const argv of Object.values(s))
    assert.ok(argv.includes("--session"), argv.join(" "));
});

test("each search gets its own session name, and every step uses it", () => {
  const a = sessionName();
  const b = sessionName();
  assert.notEqual(a, b);
  const sessionOf = (argv) => argv[argv.indexOf("--session") + 1];
  for (const argv of Object.values(steps("https://x.test", a)))
    assert.equal(sessionOf(argv), a);
});

test("a session name stays short, because the socket path of the browser is at most 103 bytes", () => {
  const name = sessionName();
  assert.ok(name.length <= SESSION_NAME_MAX, `${name.length}`);
  assert.equal(name.startsWith(SESSION_PREFIX), true);
});

test("a failed run names its label and the first line of its error", () => {
  assert.equal(failure({ exitCode: 0, stdout: "", stderr: "" }, "Open"), null);
  assert.equal(
    failure({ exitCode: 2, stdout: "", stderr: "boom\nmore" }, "Open"),
    "Open failed with exit code 2: boom",
  );
});

test("a page gives a result, and a bot check or an empty page gives a reason", () => {
  assert.ok(
    pageResult("q", "hit").text.includes("hit"),
    pageResult("q", "hit").text,
  );
  assert.notEqual(pageResult("q", "").reason, undefined);
  assert.equal(
    typeof pageResult("q", "bots use DuckDuckGo too").reason,
    "string",
  );
});

test("the cut note shows when the page text reaches the bound, even if the end is blank", () => {
  // Without a note, the result ends with the page text.
  const cut = (text) => !pageResult("q", text).text.endsWith(text.trim());
  assert.equal(cut("x".repeat(MAX_OUTPUT_CHARS)), true);
  assert.equal(cut(`${"x".repeat(MAX_OUTPUT_CHARS - 5)}     `), true);
  assert.equal(cut("x".repeat(MAX_OUTPUT_CHARS - 1)), false);
});

test("the result record has the query, the text, and the duration", () => {
  assert.deepEqual(searchResult("q", "t", 1000, 3500), {
    query: "q",
    results: ["t"],
    durationSeconds: 2.5,
  });
});
