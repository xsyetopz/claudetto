// The hooks module of dotclaude-browser.
// A `tool.call` hook on `WebSearch` answers with a search in the headless browser.
// It runs `agent-browser` as a child process with `$.process.run`, with no shell.
// It adds `--executable-path` when the CloakBrowser binary is under `~/.cloakbrowser/`.
// The `backend` option `cloakbrowser` needs that binary, and the call is denied when it is missing.
// When the browser fails or the page has no results, such as a bot check, the built-in `WebSearch` runs.
// With the `backend` option `cloakbrowser`, that result gets a notice with the reason, also after a throw, because the user chose CloakBrowser.
// With the other backend, a hook that throws is skipped and logged by Claude Code, so the built-in `WebSearch` also runs for an unexpected error.
// Each `$` call is in this file, because `$` is not followed across an import.

import type {
  BuiltinToolCallInput,
  EngineInterface,
  On,
  PluginOptions,
} from "claude-code";
import {
  CLOSE_TIMEOUT_MS,
  OPEN_TIMEOUT_MS,
  READ_TIMEOUT_MS,
} from "../features/search/limits.ts";
import {
  CLOAK_DIR,
  CLOAK_NAME,
  cloakBinaryPath,
  cloakBuilds,
  failure,
  fallbackNotice,
  INVALID_INPUT,
  MISSING_BINARY,
  PLAIN_NAME,
  pageResult,
  searchQuery,
  searchResult,
  searchUrl,
  sessionName,
  steps,
} from "../features/search/search.ts";

/** The `WebSearch` tool call that the hook reads. */
type SearchCall = Extract<BuiltinToolCallInput, { tool: "WebSearch" }>;

/** The answer of a page read: its text, or the reason that there is none. */
type PageRead = { reason: string } | { text: string };

/** Opens the search page and reads its text. Gives `{ text }` or `{ reason }`. */
async function readPage(
  $: EngineInterface,
  url: string,
  session: string,
  binary: string | null,
): Promise<PageRead> {
  const cmd = steps(url, session, binary);
  const open = await $.process.run(cmd.open, { timeoutMs: OPEN_TIMEOUT_MS });
  const opened = failure(open, "Opening the search page");
  if (opened) return { reason: opened };
  const read = await $.process.run(cmd.read, { timeoutMs: READ_TIMEOUT_MS });
  const readFailed = failure(read, "Reading the search page");
  return readFailed ? { reason: readFailed } : { text: read.stdout };
}

/**
 * Closes the session of the search, and ignores a failure.
 * The catch has no narrower test, because `$.process.run` documents no error type.
 */
async function closeSession(
  $: EngineInterface,
  url: string,
  session: string,
  binary: string | null,
): Promise<void> {
  try {
    const { close } = steps(url, session, binary);
    await $.process.run(close, { timeoutMs: CLOSE_TIMEOUT_MS });
  } catch {
    // The idle timeout of the browser closes the session.
  }
}

/** The path of the newest CloakBrowser binary, or `null` when there is none. */
async function findBinary($: EngineInterface): Promise<string | null> {
  const home = await $.env.get("HOME");
  if (!home) return null;
  const dir = `${home}/${CLOAK_DIR}`;
  // No folder of builds: there is no binary.
  // `$.fs.list` documents no error code for a missing folder, so the check asks `$.fs.exists` first.
  // A failed list reaches the log of Claude Code, and the built-in `WebSearch` answers.
  if (!(await $.fs.exists(dir))) return null;
  for (const build of cloakBuilds(await $.fs.list(dir))) {
    const path = cloakBinaryPath(home, build);
    if (await $.fs.exists(path)) return path;
  }
  return null;
}

/** The answer of `webSearch` and `answer`: a deny, a fallback, or a result. */
type Outcome =
  | { deny: string }
  | { fallback: string }
  | { result: ReturnType<typeof searchResult> };

/** A search result, a deny, or `{ fallback }` with the reason that the browser gave no results. */
async function webSearch(
  $: EngineInterface,
  e: SearchCall,
  options?: PluginOptions,
): Promise<Outcome> {
  const query = searchQuery(e);
  if (!query) return { deny: INVALID_INPUT };
  const binary = await findBinary($);
  if (!binary && options?.["backend"] === "cloakbrowser")
    return { deny: MISSING_BINARY };
  const browser = binary ? CLOAK_NAME : PLAIN_NAME;
  const url = searchUrl(query);
  const session = sessionName();
  const startedAt = Date.now();
  let page: PageRead;
  try {
    page = await readPage($, url, session, binary);
  } finally {
    await closeSession($, url, session, binary);
  }
  if ("reason" in page) return { fallback: page.reason };
  const answer = pageResult(e.query, page.text, browser);
  if ("reason" in answer) return { fallback: answer.reason };
  return { result: searchResult(e.query, answer.text, startedAt) };
}

/**
 * The answer of `webSearch`.
 * With the `cloakbrowser` backend, a throw, such as a timeout of `$.process.run`, is a `{ fallback }` with its message, so that the notice reaches Claude.
 * With the other backend, a throw is skipped and logged by Claude Code.
 * The catch has no narrower test, because `$.process.run` and `$.fs.list` document no error type.
 */
async function answer(
  $: EngineInterface,
  e: SearchCall,
  options?: PluginOptions,
): Promise<Outcome> {
  if (options?.["backend"] !== "cloakbrowser") return webSearch($, e, options);
  try {
    return await webSearch($, e, options);
  } catch (error) {
    // The cast reads `message` as the old code did, with no check of the type.
    const thrown = error as { message?: unknown } | null | undefined;
    return { fallback: `The search failed: ${thrown?.message ?? error}` };
  }
}

/** Registers the `WebSearch` hook. */
export function register(on: On, options: PluginOptions): void {
  on("tool.call", { tool: "WebSearch" }, async ($, e, next) => {
    const out = await answer($, e, options);
    if (!("fallback" in out)) return out;
    const builtIn = await next(e);
    if (options?.["backend"] !== "cloakbrowser" || builtIn.deny !== undefined)
      return builtIn;
    return {
      ...builtIn,
      context: [...(builtIn.context ?? []), fallbackNotice(out.fallback)],
    };
  });
}
