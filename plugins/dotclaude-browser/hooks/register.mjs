// The hooks module of dotclaude-browser.
// A `tool.call` hook on `WebSearch` answers with a search in the headless browser.
// It runs `agent-browser` as a child process with `$.process.run`, with no shell.
// When the browser fails, or the `backend` option is `cloakbrowser`, the call is denied
// with a reason that names the browser skill.
// Each `$` call is in this file, because `$` is not followed across an import.

import {
  CLOSE_TIMEOUT_MS,
  OPEN_TIMEOUT_MS,
  READ_TIMEOUT_MS,
} from "../features/search/limits.mjs";
import {
  denyText,
  failure,
  INVALID_INPUT,
  pageResult,
  searchQuery,
  searchResult,
  searchUrl,
  sessionName,
  steps,
} from "../features/search/search.mjs";

/** Opens the search page and reads its text. Gives `{ text }` or `{ reason }`. */
async function readPage($, url, session) {
  const cmd = steps(url, session);
  const open = await $.process.run(cmd.open, { timeoutMs: OPEN_TIMEOUT_MS });
  const opened = failure(open, "Opening the search page");
  if (opened) return { reason: opened };
  const read = await $.process.run(cmd.read, { timeoutMs: READ_TIMEOUT_MS });
  const readFailed = failure(read, "Reading the search page");
  return readFailed ? { reason: readFailed } : { text: read.stdout };
}

/** Closes the session of the search, and ignores a failure. */
async function closeSession($, url, session) {
  try {
    await $.process.run(steps(url, session).close, {
      timeoutMs: CLOSE_TIMEOUT_MS,
    });
  } catch {
    // The idle timeout of the browser closes the session.
  }
}

/** The result of the `tool.call` event: a search result, or a deny that names the skill. */
async function webSearch($, e, options) {
  const query = searchQuery(e);
  if (!query) return { deny: INVALID_INPUT };
  if (options?.backend === "cloakbrowser")
    return {
      deny: denyText(
        "The `backend` option is `cloakbrowser`, and this search uses `agent-browser`.",
      ),
    };
  const url = searchUrl(query);
  const session = sessionName();
  const startedAt = Date.now();
  let page;
  try {
    page = await readPage($, url, session);
  } catch {
    page = { reason: "The browser did not start or ran too long." };
  } finally {
    await closeSession($, url, session);
  }
  if (page.reason) return { deny: denyText(page.reason) };
  const answer = pageResult(e.query, page.text);
  if (!answer.text) return { deny: denyText(answer.reason) };
  return { result: searchResult(e.query, answer.text, startedAt) };
}

export function register(on, options) {
  on("tool.call", { tool: "WebSearch" }, async ($, e) => {
    try {
      return await webSearch($, e, options);
    } catch {
      return { deny: denyText("The search failed.") };
    }
  });
}
