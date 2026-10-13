# Browser

The plugin `dotclaude-browser` drives a real browser for Claude.
Read this page to set up the browser, or to learn how the `WebSearch` handler works and when it falls back.

The plugin has two slices.
The slice `browse` gives the skill `browse` and the command `dotclaude-browser-guide`.
The slice `search` answers each `WebSearch` call with a search in the headless browser.
The plugin works without the core plugin.
It imports nothing from another plugin.

The source is in `src/plugins/dotclaude-browser/`.
The tests are in `tests/browser/`.

## What It Adds

| Part | Slice | What it gives |
| --- | --- | --- |
| Skill `browse` | `browse` | Steps to open, click, fill, or read a page with `agent-browser` |
| Command `dotclaude-browser-guide` | `browse` | Prints the `agent-browser` guide that the skill loads |
| Handler on `WebSearch` | `search` | Runs a search in the headless browser, and falls back to the built-in `WebSearch` |
| Option `backend` | `search` | Chooses `agent-browser` (the default) or `cloakbrowser` |

## Install

1. Install `agent-browser` with `npm install -g agent-browser`.
   The skill asks the user for this command when the binary is missing (`NOT_INSTALLED` in `slices/browse/domain/guide.ts`).
2. For the `cloakbrowser` backend, install CloakBrowser.
   The plugin does not install it.
   The binary must be at `~/.cloakbrowser/chromium-<version>/Chromium.app/Contents/MacOS/Chromium` (`CLOAK_DIR` and `CLOAK_BINARY` in `slices/search/domain/search.ts`).
   Only this macOS layout is in the code.
3. Install the plugin with `/plugin install dotclaude-browser@dotclaude`.
4. Set the option `backend` in the plugin settings.
   Its default is `agent-browser`.
   Its other value is `cloakbrowser` (`slices/search/slice.ts`).

## The Skill and the Guide

The skill `browse` has the `allowed-tools` entries `Bash(agent-browser *)` and `Bash(dotclaude-browser-guide)`.
Its body includes the output of `dotclaude-browser-guide` at load time, through a `!` command in `slices/browse/skills/browse/SKILL.md`.

The command runs `agent-browser skills get core` with `Bun.spawnSync`.
It has no shell (`runGuide` in `slices/browse/adapters/cli.ts`).
The guide text is cut at `MAX_GUIDE_CHARS`.
The cut text ends with a notice.
The notice names the command that reads the rest (`guideText` in `slices/browse/domain/guide.ts`).
The command exits with 0 also when the guide is missing.
The text then tells Claude what to do.

## The WebSearch Handler

The handler is a `tool.call` mod handler with the filter `{ tool: "WebSearch" }` and the phase `answer` (`slices/search/slice.ts`).
Its code is in `slices/search/adapters/mod.ts`.
Its pure logic is in `slices/search/domain/search.ts`.

For each call, the handler does these steps:

1. It builds the query from the `query` field and from the `allowed_domains` and `blocked_domains` fields.
   Each domain becomes a `site:` term.
   A blocked domain becomes a `-site:` term (`searchQuery`).
   It takes at most `MAX_DOMAINS` domains from each list.
   It skips a name with a character outside `[\w.-]`.
2. It denies the call with `INVALID_INPUT` when the query is empty.
3. It looks for the newest CloakBrowser build.
   It lists the folder `~/.cloakbrowser/`, keeps the `chromium-<version>` folders, and sorts them by the numbers of the version (`findBinary` and `cloakBuilds`).
4. It denies the call with `MISSING_BINARY` when the `backend` option is `cloakbrowser` and no binary exists.
5. It opens the search page in a session with `agent-browser open`.
   It reads the body text with `get text body`, and it closes the session.
   The read uses `--max-output` with `MAX_OUTPUT_CHARS`.
   The session name starts with `dcws`, so that a search never uses a session of the user (`sessionName`).
6. It answers with the page text when the page has text and no bot check (`pageResult`).
   It falls back when the page has no text, when the page shows a bot check, or when a step fails.

## Fallback and Errors

When the handler falls back, the built-in `WebSearch` answers.
With the `cloakbrowser` backend, the built-in result gets a notice.
The notice says that CloakBrowser gave no results (`fallbackNotice`).
With the `cloakbrowser` backend, a thrown error also becomes a fallback.
The fallback carries the message of the error.
With the `agent-browser` backend, Claude Code skips and logs a thrown error.
The built-in `WebSearch` then answers.

## Third-Party Content

The page text is third-party content.
The result says so before the page text (`pageResult`).

## Bounds

| Bound | Value | File | Use |
| --- | --- | --- | --- |
| `MAX_GUIDE_CHARS` | 40000 | `slices/browse/limits.ts` | Most characters of the guide in the skill |
| `GUIDE_TIMEOUT_MS` | 15000 ms | `slices/browse/limits.ts` | Time for `agent-browser skills get core` |
| `MAX_OUTPUT_CHARS` | 20000 | `slices/search/limits.ts` | Most characters of page text in one result, and the `--max-output` of the read |
| `OPEN_TIMEOUT_MS` | 30000 ms | `slices/search/limits.ts` | Time to open the search page |
| `READ_TIMEOUT_MS` | 15000 ms | `slices/search/limits.ts` | Time to read the page text |
| `CLOSE_TIMEOUT_MS` | 10000 ms | `slices/search/limits.ts` | Time to close the session |
| `SESSION_PREFIX` | `dcws` | `slices/search/limits.ts` | Start of each session name |
| `SESSION_NAME_MAX` | 12 | `slices/search/limits.ts` | Longest session name, checked by `tests/browser/search.test.ts` |
| `MAX_DOMAINS` | 10 | `slices/search/limits.ts` | Most domains in each filter list |
| `SEARCH_URL` | `https://html.duckduckgo.com/html/` | `slices/search/limits.ts` | The search page, which needs no script and no sign-in |

## Session Names

The session name has a counter in base 36 and five random characters after the prefix.
The comment in `slices/search/limits.ts` gives the reason for `SESSION_NAME_MAX`.
The browser makes a socket path under the home folder.
macOS refuses a path over 103 bytes.

## Why

- The plugin answers `WebSearch` in the headless browser.
  It keeps the built-in tool as the fallback.
  The fallback keeps a search working when the browser gets a bot check.
- The `search` slice uses a `tool.call` handler on `WebSearch`, in the phase `answer`.
  The handler reads the `backend` option through `keepOptions`.
- The plugin uses `Bun.spawnSync` in the guide command and `$.process.run` in the mod handler.
  Neither uses a shell.
  The arguments are passed as a list.
- DuckDuckGo's HTML page needs no script and no sign-in, so `agent-browser` can read it (`SEARCH_URL`).
- Each add-on stays a separate plugin.
  See D24 in [Decisions-Layout](Decisions-Layout).
  The layout page also records that the browser plugin replaces the built-in `WebSearch` with its headless browser.
- The guide bound keeps the text of the skill small in the context of the session.

## Related Pages

- [Troubleshooting](Troubleshooting): the symptoms of this plugin and their fixes.
- [Library Docs](Library-Docs): the next add-on page.
- [Attributions](Attributions): the license of `agent-browser` and of CloakBrowser.
- [Add-On Plugins](Add-Ons): the list of the add-on plugins.
