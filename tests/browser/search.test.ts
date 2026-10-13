// dotclaude-browser: the pure parts of the web search.

import { expect, test } from "bun:test";
import {
  failure,
  pageResult,
  searchQuery,
  searchResult,
  searchUrl,
  sessionName,
  steps,
} from "../../plugins/dotclaude-browser/slices/search/domain/search.ts";
import {
  MAX_OUTPUT_CHARS,
  SESSION_NAME_MAX,
  SESSION_PREFIX,
} from "../../plugins/dotclaude-browser/slices/search/limits.ts";

/** The reason of a page result, or `undefined` when the page gave text. */
const reasonOf = (page: ReturnType<typeof pageResult>) =>
  "reason" in page ? page.reason : undefined;

test("the query takes the domain filters as search terms", () => {
  expect(
    searchQuery({
      query: " bun ",
      allowed_domains: ["bun.sh", "x y"],
      blocked_domains: ["a.com"],
    }),
  ).toBe("bun site:bun.sh -site:a.com");
  expect(searchQuery({ query: "" })).toBe(null);
  expect(searchQuery(undefined)).toBe(null);
});

test("the URL encodes the query", () => {
  expect(searchUrl("a&b c")).toBe(
    "https://html.duckduckgo.com/html/?q=a%26b%20c",
  );
});

test("the steps run in an own session and bound the output", () => {
  const s = steps("https://x.test", "dotclaude-websearch-1");
  expect(s.open.slice(-2)).toStrictEqual(["open", "https://x.test"]);
  expect(
    s.read.includes(String(MAX_OUTPUT_CHARS)),
    s.read.join(" "),
  ).toBeTruthy();
  for (const argv of Object.values(s))
    expect(argv.includes("--session"), argv.join(" ")).toBeTruthy();
});

test("each search gets its own session name, and every step uses it", () => {
  const a = sessionName();
  const b = sessionName();
  expect(a).not.toBe(b);
  const sessionOf = (argv: string[]) => argv[argv.indexOf("--session") + 1];
  for (const argv of Object.values(steps("https://x.test", a)))
    expect(sessionOf(argv)).toBe(a);
});

test("a session name stays short, because the socket path of the browser is at most 103 bytes", () => {
  const name = sessionName();
  expect(name.length <= SESSION_NAME_MAX, `${name.length}`).toBeTruthy();
  expect(name.startsWith(SESSION_PREFIX)).toBe(true);
});

test("a failed run names its label and the first line of its error", () => {
  expect(failure({ exitCode: 0, stdout: "", stderr: "" }, "Open")).toBe(null);
  expect(
    failure({ exitCode: 2, stdout: "", stderr: "boom\nmore" }, "Open"),
  ).toBe("Open failed with exit code 2: boom");
});

test("a page gives a result, and a bot check or an empty page gives a reason", () => {
  const hit = pageResult("q", "hit");
  expect(
    "text" in hit && hit.text.includes("hit"),
    JSON.stringify(hit),
  ).toBeTruthy();
  expect(reasonOf(pageResult("q", ""))).not.toBe(undefined);
  expect(typeof reasonOf(pageResult("q", "bots use DuckDuckGo too"))).toBe(
    "string",
  );
});

test("the cut note shows when the page text reaches the bound, even if the end is blank", () => {
  // Without a note, the result ends with the page text.
  const cut = (text: string) => {
    const page = pageResult("q", text);
    return !("text" in page && page.text.endsWith(text.trim()));
  };
  expect(cut("x".repeat(MAX_OUTPUT_CHARS))).toBe(true);
  expect(cut(`${"x".repeat(MAX_OUTPUT_CHARS - 5)}     `)).toBe(true);
  expect(cut("x".repeat(MAX_OUTPUT_CHARS - 1))).toBe(false);
});

test("the result record has the query, the text, and the duration", () => {
  expect(searchResult("q", "t", 1000, 3500)).toStrictEqual({
    query: "q",
    results: ["t"],
    durationSeconds: 2.5,
  });
});
