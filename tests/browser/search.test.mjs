// dotclaude-browser: the pure parts of the web search.

import { expect, test } from "bun:test";
import {
  MAX_OUTPUT_CHARS,
  SESSION_NAME_MAX,
  SESSION_PREFIX,
} from "../../plugins/dotclaude-browser/features/search/limits.mjs";
import {
  denyText,
  failure,
  pageResult,
  searchQuery,
  searchResult,
  searchUrl,
  sessionName,
  steps,
} from "../../plugins/dotclaude-browser/features/search/search.mjs";

test("the query takes the domain filters as search terms", () => {
  expect(
    searchQuery({
      query: " bun ",
      allowed_domains: ["bun.sh", "x y"],
      blocked_domains: ["a.com"],
    }),
  ).toBe("bun site:bun.sh -site:a.com");
  expect(searchQuery({ query: "" })).toBeNull();
  expect(searchQuery(undefined)).toBeNull();
});

test("the URL encodes the query", () => {
  expect(searchUrl("a&b c")).toBe(
    "https://html.duckduckgo.com/html/?q=a%26b%20c",
  );
});

test("the steps run in an own session and bound the output", () => {
  const s = steps("https://x.test", "dotclaude-websearch-1");
  expect(s.open.slice(-2)).toEqual(["open", "https://x.test"]);
  expect(s.read).toContain(String(MAX_OUTPUT_CHARS));
  for (const argv of Object.values(s)) expect(argv).toContain("--session");
});

test("each search gets its own session name, and every step uses it", () => {
  const a = sessionName();
  const b = sessionName();
  expect(a).not.toBe(b);
  const sessionOf = (argv) => argv[argv.indexOf("--session") + 1];
  for (const argv of Object.values(steps("https://x.test", a)))
    expect(sessionOf(argv)).toBe(a);
});

test("a session name stays short, because the socket path of the browser is at most 103 bytes", () => {
  const name = sessionName();
  expect(name.length).toBeLessThanOrEqual(SESSION_NAME_MAX);
  expect(name.startsWith(SESSION_PREFIX)).toBe(true);
});

test("a failed run names its label and the first line of its error", () => {
  expect(failure({ exitCode: 0, stdout: "", stderr: "" }, "Open")).toBeNull();
  expect(
    failure({ exitCode: 2, stdout: "", stderr: "boom\nmore" }, "Open"),
  ).toBe("Open failed with exit code 2: boom");
});

test("a page gives a result, and a bot check or an empty page gives a reason", () => {
  expect(pageResult("q", "hit").text).toContain("hit");
  expect(pageResult("q", "").reason).toBeDefined();
  expect(pageResult("q", "bots use DuckDuckGo too").reason).toContain(
    "bot check",
  );
});

test("the result record and the deny text carry the reason", () => {
  expect(searchResult("q", "t", 1000, 3500)).toEqual({
    query: "q",
    results: ["t"],
    durationSeconds: 2.5,
  });
  expect(denyText("why")).toContain("why");
});
