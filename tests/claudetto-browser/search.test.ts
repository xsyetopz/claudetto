// claudetto-browser: the pure parts of the web search.

import { expect, test } from "bun:test";
import {
  cloakBuilds,
  failure,
  pageResult,
  searchNotices,
  searchQuery,
  searchResult,
  searchUrl,
  sessionName,
  steps,
} from "../../plugins/claudetto-browser/slices/search/domain/search.ts";
import {
  MAX_DOMAINS,
  MAX_OUTPUT_CHARS,
  RESULTS_SELECTOR,
  SESSION_COUNTER_CHARS,
  SESSION_NAME_MAX,
  SESSION_PREFIX,
  SESSION_RANDOM_CHARS,
} from "../../plugins/claudetto-browser/slices/search/limits.ts";

/** The reason of a page result, or `undefined` when the page gave text. */
const reasonOf = (page: ReturnType<typeof pageResult>) =>
  "reason" in page ? page.reason : undefined;

test("the query takes the domain filters as search terms", () => {
  expect(
    searchQuery({
      query: " bun ",
      allowed_domains: ["bun.com", "x y"],
      blocked_domains: ["a.com"],
    }),
  ).toBe("bun site:bun.com -site:a.com");
  expect(searchQuery({ query: "" })).toBe(null);
  expect(searchQuery(undefined)).toBe(null);
});

test("two allowed domains are one `OR` group, and blocked domains stay apart", () => {
  expect(
    searchQuery({
      query: "bun",
      allowed_domains: ["bun.com", "nodejs.org"],
      blocked_domains: ["a.com", "b.com"],
    }),
  ).toBe("bun (site:bun.com OR site:nodejs.org) -site:a.com -site:b.com");
});

test("the URL encodes the query", () => {
  expect(searchUrl("a&b c")).toBe(
    "https://html.duckduckgo.com/html/?q=a%26b%20c",
  );
});

test("the steps run in an own session with the CloakBrowser binary and bound the output", () => {
  const s = steps("https://x.test", "claudetto-websearch-1", "/bin/c");
  expect(s.open.slice(-2)).toStrictEqual(["open", "https://x.test"]);
  expect(s.results.slice(-1)).toStrictEqual([RESULTS_SELECTOR]);
  expect(
    s.results.includes(String(MAX_OUTPUT_CHARS)),
    s.results.join(" "),
  ).toBeTruthy();
  for (const argv of Object.values(s)) {
    expect(argv.includes("--session"), argv.join(" ")).toBeTruthy();
    expect(argv[argv.indexOf("--executable-path") + 1]).toBe("/bin/c");
  }
});

test("each search gets its own session name, and every step uses it", () => {
  const a = sessionName();
  const b = sessionName();
  expect(a).not.toBe(b);
  const sessionOf = (argv: string[]) => argv[argv.indexOf("--session") + 1];
  for (const argv of Object.values(steps("https://x.test", a, "/bin/c")))
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

test("the text of the results gives a result, and an empty text gives a reason", () => {
  const hit = pageResult("q", "hit");
  expect(
    "text" in hit && hit.text.includes("hit"),
    JSON.stringify(hit),
  ).toBeTruthy();
  expect(reasonOf(pageResult("q", " \n"))).not.toBe(undefined);
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

test("the parts of a session name fit in `SESSION_NAME_MAX`", () => {
  expect(
    SESSION_PREFIX.length + SESSION_COUNTER_CHARS + SESSION_RANDOM_CHARS <=
      SESSION_NAME_MAX,
  ).toBe(true);
});

test("a dropped domain and the `extended` mode give notices, and a clean input gives none", () => {
  expect(searchNotices({ query: "q", allowed_domains: ["bun.com"] })).toEqual(
    [],
  );
  const dropped = searchNotices({
    query: "q",
    blocked_domains: [
      "a b",
      ...Array.from({ length: MAX_DOMAINS }, () => "x.y"),
    ],
    mode: "extended",
  });
  expect(dropped.join("\n")).toContain(
    "`blocked_domains` filter did not apply",
  );
  expect(dropped.join("\n")).toContain("a b");
  expect(dropped.join("\n")).toContain("`extended` mode did not apply");
});

test("the notices are in the page result", () => {
  const page = pageResult("q", "hit", ["A notice."]);
  expect("text" in page && page.text.includes("A notice.")).toBe(true);
});

test("`cloakBuilds` keeps a linked build folder and sorts the builds newest first", () => {
  const entry = (name: string, kind: string, isLink = false) => ({
    name,
    kind,
    isLink,
  });
  expect(
    cloakBuilds([
      entry("chromium-9.1.0", "dir"),
      entry("chromium-151.0.1", "other", true),
      entry("chromium-10.0.0", "file"),
      entry("notes", "dir"),
    ]),
  ).toStrictEqual(["chromium-151.0.1", "chromium-9.1.0"]);
});
