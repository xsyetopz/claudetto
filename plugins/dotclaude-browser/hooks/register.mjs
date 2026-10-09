// The hooks module of dotclaude-browser.
// A `tool.call` hook on `WebSearch` answers with a search in the headless browser.
// It runs `agent-browser` as a child process with `$.process.run`, with no shell.
// It adds `--executable-path` when the CloakBrowser binary is under `~/.cloakbrowser/`.
// The `backend` option `cloakbrowser` needs that binary, and the call is denied when it is missing.
// When the browser fails or the page has no results, such as a bot check, the built-in `WebSearch` runs.
// Each `$` call is in this file, because `$` is not followed across an import.

import {
  CLOSE_TIMEOUT_MS,
  OPEN_TIMEOUT_MS,
  READ_TIMEOUT_MS,
} from "../features/search/limits.mjs";
import {
  CLOAK_DIR,
  CLOAK_NAME,
  cloakBinaryPath,
  cloakBuilds,
  failure,
  INVALID_INPUT,
  MISSING_BINARY,
  PLAIN_NAME,
  pageResult,
  searchQuery,
  searchResult,
  searchUrl,
  sessionName,
  steps,
} from "../features/search/search.mjs";

/** Opens the search page and reads its text. Gives `{ text }` or `{ reason }`. */
async function readPage($, url, session, binary) {
  const cmd = steps(url, session, binary);
  const open = await $.process.run(cmd.open, { timeoutMs: OPEN_TIMEOUT_MS });
  const opened = failure(open, "Opening the search page");
  if (opened) return { reason: opened };
  const read = await $.process.run(cmd.read, { timeoutMs: READ_TIMEOUT_MS });
  const readFailed = failure(read, "Reading the search page");
  return readFailed ? { reason: readFailed } : { text: read.stdout };
}

/** Closes the session of the search, and ignores a failure. */
async function closeSession($, url, session, binary) {
  try {
    await $.process.run(steps(url, session, binary).close, {
      timeoutMs: CLOSE_TIMEOUT_MS,
    });
  } catch {
    // The idle timeout of the browser closes the session.
  }
}

/** The path of the newest CloakBrowser binary, or `null` when there is none. */
async function findBinary($) {
  try {
    const home = await $.env.get("HOME");
    if (!home) return null;
    const entries = await $.fs.list(`${home}/${CLOAK_DIR}`);
    for (const build of cloakBuilds(entries)) {
      const path = cloakBinaryPath(home, build);
      if (await $.fs.exists(path)) return path;
    }
  } catch {
    // No folder of builds: there is no binary.
  }
  return null;
}

/** A search result or a deny, or `null` when the browser gave no results and the built-in `WebSearch` runs. */
async function webSearch($, e, options) {
  const query = searchQuery(e);
  if (!query) return { deny: INVALID_INPUT };
  const binary = await findBinary($);
  if (!binary && options?.backend === "cloakbrowser")
    return { deny: MISSING_BINARY };
  const browser = binary ? CLOAK_NAME : PLAIN_NAME;
  const url = searchUrl(query);
  const session = sessionName();
  const startedAt = Date.now();
  let page;
  try {
    page = await readPage($, url, session, binary);
  } catch {
    page = { reason: "The browser did not start or ran too long." };
  } finally {
    await closeSession($, url, session, binary);
  }
  if (page.reason) return null;
  const answer = pageResult(e.query, page.text, browser);
  if (!answer.text) return null;
  return { result: searchResult(e.query, answer.text, startedAt) };
}

export function register(on, options) {
  on("tool.call", { tool: "WebSearch" }, async ($, e, next) => {
    let out = null;
    try {
      out = await webSearch($, e, options);
    } catch {
      // The search failed, so the built-in `WebSearch` answers.
    }
    return out ?? next(e);
  });
}
