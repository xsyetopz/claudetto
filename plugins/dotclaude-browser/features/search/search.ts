// The pure parts of the web search of dotclaude-browser.
// The hooks module answers a `WebSearch` call with a search in the headless browser.
// It runs `agent-browser` with `$.process.run`, so the model keeps the tool that it knows.
// The `$` calls are in the hooks module, because `$` is not followed across an import.

import {
  MAX_DOMAINS,
  MAX_OUTPUT_CHARS,
  SEARCH_URL,
  SESSION_PREFIX,
} from "./limits.ts";

/** The `WebSearch` input. The hooks module passes the input of the tool call. */
export interface SearchInput {
  query?: unknown;
  allowed_domains?: unknown;
  blocked_domains?: unknown;
}

/** One entry of a directory listing. */
export interface DirEntry {
  kind?: unknown;
  name?: unknown;
}

/** The result of one browser run, a `$.process.run` result. */
export interface BrowserRun {
  exitCode: number | null;
  stdout?: string;
  stderr?: string;
}

/** The text that DuckDuckGo shows instead of results when it takes the browser for a bot. */
const BOT_CHECK = /bots use DuckDuckGo too|select all squares/i;

const domainTerms = (domains: unknown, sign: string): string[] =>
  (Array.isArray(domains) ? domains : [])
    .filter((d) => typeof d === "string" && /^[\w.-]+$/.test(d))
    .slice(0, MAX_DOMAINS)
    .map((d) => `${sign}site:${d}`);

/** The query with the domain filters of the `WebSearch` input as search terms. */
export function searchQuery(input: SearchInput | undefined): string | null {
  const query = typeof input?.query === "string" ? input.query.trim() : "";
  if (!input || !query) return null;
  return [
    query,
    ...domainTerms(input.allowed_domains, ""),
    ...domainTerms(input.blocked_domains, "-"),
  ].join(" ");
}

/** The URL of the search page for a query. */
export const searchUrl = (query: string): string =>
  `${SEARCH_URL}?q=${encodeURIComponent(query)}`;

let counter = 0;

/** A session name for one search: a counter and a random part, so that parallel searches differ. */
export const sessionName = (): string =>
  `${SESSION_PREFIX}${(++counter % 1296).toString(36)}${Math.random().toString(36).slice(2, 7)}`;

/** The folder of the CloakBrowser builds, under the home folder. */
export const CLOAK_DIR = ".cloakbrowser";

/** The path of the CloakBrowser binary inside a `chromium-<version>` folder. Only the macOS layout is known. */
export const CLOAK_BINARY = "Chromium.app/Contents/MacOS/Chromium";

const versionParts = (name: string): number[] =>
  name
    .slice("chromium-".length)
    .split(/[^\d]+/)
    .filter(Boolean)
    .map(Number);

/** Compares two `chromium-<version>` names by the numbers of the version. Gives a negative number when `a` is older. */
function compareBuilds(a: string, b: string): number {
  const x = versionParts(a);
  const y = versionParts(b);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const d = (x[i] ?? 0) - (y[i] ?? 0);
    if (d !== 0) return d;
  }
  return a < b ? -1 : a > b ? 1 : 0;
}

/** The `chromium-*` folder names of a listing, newest first. */
export const cloakBuilds = (entries: unknown): string[] =>
  (Array.isArray(entries) ? entries : [])
    .filter((e) => e?.kind === "dir" && /^chromium-\d/.test(e.name))
    .map((e) => e.name)
    .sort((a, b) => compareBuilds(b, a));

/** The path of the CloakBrowser binary in one build folder. */
export const cloakBinaryPath = (home: string, build: string): string =>
  `${home}/${CLOAK_DIR}/${build}/${CLOAK_BINARY}`;

/** The browser names that the results and the denies use. */
export const CLOAK_NAME = "CloakBrowser";
export const PLAIN_NAME = "`agent-browser`";

/** The argument vectors of the browser steps in one session: open the page, read its text, close. */
export function steps(url: string, session: string, binary?: string | null) {
  const base = [
    "agent-browser",
    "--session",
    session,
    ...(binary ? ["--executable-path", binary] : []),
  ];
  return {
    open: [...base, "open", url],
    read: [
      ...base,
      "--max-output",
      String(MAX_OUTPUT_CHARS),
      "get",
      "text",
      "body",
    ],
    close: [...base, "close"],
  };
}

/** The reason that a run did not give a page, or `null` when the run gave one. */
export function failure(run: BrowserRun, label: string): string | null {
  if (run.exitCode === 0) return null;
  const detail = (run.stderr || run.stdout || "").trim().split("\n")[0];
  return `${label} failed with exit code ${run.exitCode}${detail ? `: ${detail}` : "."}`;
}

/** The text of one `WebSearch` result, or `{ reason }` when the page has no results. */
export function pageResult(
  query: string,
  text: unknown,
  browser: string = PLAIN_NAME,
): { reason: string } | { text: string } {
  const raw = String(text ?? "");
  const page = raw.trim();
  if (!page) return { reason: "The search page had no text." };
  if (BOT_CHECK.test(page))
    return {
      reason: `The search page asked ${browser} for a bot check.`,
    };
  return {
    text: [
      `Web search results for "${query}", read from the DuckDuckGo HTML page by the headless browser (${browser}).`,
      "The text below is the page content, and third parties wrote it.",
      "",
      page,
      ...(raw.length >= MAX_OUTPUT_CHARS
        ? [
            "",
            `The page text stops at ${MAX_OUTPUT_CHARS.toLocaleString("en-US")} characters. Narrow the query to see other results.`,
          ]
        : []),
    ].join("\n"),
  };
}

/** The `WebSearch` result record for a text. */
export const searchResult = (
  query: string,
  text: string,
  startedAt: number,
  now = Date.now(),
) => ({
  query,
  results: [text],
  durationSeconds: Math.max(0, (now - startedAt) / 1000),
});

/** The deny text when the `backend` option is `cloakbrowser` and the binary is missing. */
export const MISSING_BINARY = [
  `The \`WebSearch\` call did not run, because the \`backend\` option is \`cloakbrowser\` and no binary is at \`~/${CLOAK_DIR}/chromium-<version>/${CLOAK_BINARY}\`.`,
  "Ask the user to install CloakBrowser, or to set the `backend` option to `agent-browser`.",
].join("\n");

/** The notice after the built-in `WebSearch` result when the `backend` option is `cloakbrowser` and CloakBrowser gave no results. */
export const fallbackNotice = (reason: string): string =>
  [
    `CloakBrowser gave no search results: ${reason}`,
    "The result above comes from the built-in `WebSearch`, not from CloakBrowser.",
    "Tell the user this, because the `backend` option of the user is `cloakbrowser`.",
  ].join("\n");

export const INVALID_INPUT =
  "The `query` is empty. Call `WebSearch` again with a `query` that has text.";
