# Browser

The plugin `claudetto-browser` drives a real browser for Claude.
Read this page to set up the browser, to learn how the `WebSearch` handler works, and to learn which commands the skill grants.

The plugin has two slices.
The slice `browse` gives the skill `browse` and the command `claudetto-browser-guide`.
With the `cloakbrowser` backend, the slice `search` answers a `WebSearch` call with a search in CloakBrowser.
The plugin works without the core plugin.
It imports nothing from another plugin.

The source is in `src/plugins/claudetto-browser/`.
The tests are in `tests/claudetto-browser/`.

## What It Adds

| Part | Slice | What it gives |
| --- | --- | --- |
| Skill `browse` | `browse` | Steps to open, click, fill, or read a page with `agent-browser` |
| Command `claudetto-browser-guide` | `browse` | Prints the `agent-browser` guide that the skill loads |
| Handler on `WebSearch` | `search` | With the `cloakbrowser` backend, runs a search in CloakBrowser, and falls back to the built-in `WebSearch` |
| Option `backend` | `search` | Chooses `agent-browser` (the default) or `cloakbrowser` |

## Install

1. Install `agent-browser` with `npm install -g agent-browser`.
   The skill asks the user for this command when the binary is missing (`prompts/not-installed.md` in `slices/browse/`).
2. Install the plugin with `/plugin install claudetto-browser@claudetto`.
3. Optional: use CloakBrowser for `WebSearch`.
   Install it yourself, because the plugin does not install it.
   The free build needs no key and no sign-in, and it gets past the bot check of DuckDuckGo.
   For macOS on Apple silicon, get `cloakbrowser-darwin-arm64.tar.gz` from the GitHub release `chromium-v145.0.7632.109.2` of `CloakHQ/CloakBrowser`,
   and extract it into `~/.cloakbrowser/chromium-145.0.7632.109.2/`.
   This build is from March 2026, and CloakBrowser says that an old build can stop getting past the bot checks.
   It got results on 2026-10-16.
   If each search gives the notice of a bot check, install a newer free build.
   The newer free builds need a free key from a GitHub sign-in (`cloakbrowser login`).
   The plugin uses each build in the same way, and it uses the newest build in `~/.cloakbrowser/`.
   The binary must be at `~/.cloakbrowser/chromium-<version>/Chromium.app/Contents/MacOS/Chromium` (`CLOAK_DIR` and `CLOAK_BINARY` in `slices/search/domain/search.ts`).
   Only this macOS layout is in the code.
   The `chromium-<version>` folder can be a symbolic link.
   Then set the option `backend` to `cloakbrowser` in the plugin settings.
   Allow `WebSearch` in the permission rules if you want CloakBrowser to answer it.
   The handler searches only when the rules allow the call (see [The Permission Check](#the-permission-check)).

## CloakBrowser Is Opt-In

The default value of `backend` is `agent-browser`.
With this value, the handler passes each `WebSearch` call to the built-in `WebSearch`, and no browser runs.
This is by design, because the plain headless browser gets a bot check from each search engine that was probed.
The skill `browse` uses the plain `agent-browser` for pages.
CloakBrowser runs only when you set `backend` to `cloakbrowser`.
With that value and no binary, the handler denies the call and says how to fix it (`prompts/missing-binary.md` in `slices/search/`).

## The Skill and the Guide

The skill `browse` has `allowed-tools` entries for the subcommands that the `agent-browser` guide uses to open, read, and operate a page.
They are `open`, `snapshot`, `click`, `dblclick`, `hover`, `focus`, `fill`, `type`, `press`, `select`, `check`, `uncheck`, `scroll`, `scrollintoview`, `wait`, `screenshot`, `get`, `read`, `find`, `tab`, `close`, and `session`.
It also grants `Bash(claudetto-browser-guide)`.
A subcommand that is not in the list, such as `eval`, `network`, `auth`, `upload`, or `install`, makes Claude Code ask for permission.
The skill puts the flags of CloakBrowser after the subcommand, so that the grant matches the command.

The body of the skill includes the output of `claudetto-browser-guide` at load time, through a `!` command in `slices/browse/skills/browse/SKILL.md`.
The command runs `agent-browser skills get core` with `Bun.spawnSync` and no shell (`runGuide` in `slices/browse/adapters/cli.ts`).
The guide text is cut at `MAX_GUIDE_CHARS`, and the cut text ends with a notice (`prompts/guide-cut.md` in `slices/browse/`, used by `guideText`).
The command exits with 0 also when the guide is missing, and the text then tells Claude what to do.

The skill tells Claude to run `agent-browser close` when the task ends, also after an error.

## The Permission Check

The handler is a `tool.call` handler.
Claude Code runs the permission check after such a handler, so an answer of the handler would skip the check.
The handler therefore asks `$.tool.check` for the verdict on the call first.
When the verdict is not `allow`, the handler does not search.
It calls `next`, and Claude Code applies the rule: a `deny` rule stops the call, and an `ask` verdict shows the dialog.
The built-in `WebSearch` then answers.

## The WebSearch Handler

The handler has the filter `{ tool: "WebSearch" }` and the phase `answer` (`slices/search/slice.ts`).
Its code is in `slices/search/adapters/mod.ts`.
Its pure logic is in `slices/search/domain/search.ts`.

With the `agent-browser` backend, the handler calls `next` at once, and the built-in `WebSearch` answers.
Each search engine gives the plain headless browser a bot check, a captcha, or no results.
A search in it costs about 7 seconds and then falls back, so the handler does not try it.

With the `cloakbrowser` backend, the handler does these steps for each call:

1. It denies the call with `prompts/invalid-input.md` when the query is empty.
2. It checks the permission rules, as the section above says.
3. It builds the query from the `query` field and from the `allowed_domains` and `blocked_domains` fields.
   Each domain becomes a `site:` term, and a blocked domain becomes a `-site:` term (`searchQuery`).
4. It looks for the newest CloakBrowser build (`findBinary` and `cloakBuilds`).
   When there is no build, it denies the call with `prompts/missing-binary.md`.
5. It opens the search page in a session of its own with `agent-browser open` and `--executable-path`.
   It reads the text of the results with `get text` on `RESULTS_SELECTOR` and the bound `MAX_OUTPUT_CHARS`.
   This text has no menus of regions and dates.
   Then it closes the session.
6. It answers with the text of the results (`pageResult`, with `prompts/page-header.md`).
   It falls back when the page has no results element, when the results have no text, or when a step fails.

A bot check page has no results element, so the read exits with an error (`readPage`).
The handler finds a bot check from the structure of the page, and not from its words, so this works in each language of the page.

## Notices in the Result

The search cannot apply every option of `WebSearch`.
When it cannot, the result says so before the page text (`searchNotices`, with `prompts/domain-dropped.md` and `prompts/extended-mode.md`):

- A domain name with a character outside letters, digits, dots, and hyphens is dropped.
  Entries after the first `MAX_DOMAINS` names of a list are dropped too.
  The notice names the dropped entries.
- The `extended` mode gets one page of results.
  The notice says that the mode did not apply.

## Close and Errors

Each search has its own session name, and the handler closes only that session.
When the close fails or throws, the handler writes the error to the log with `$.ui.log`.
The next search uses a new session name, so it never reuses a session that did not close.
The idle timeout of the browser closes the old session later.

When the handler falls back, the built-in `WebSearch` answers.
The built-in result gets a notice that CloakBrowser gave no results, with the reason (`prompts/fallback-notice.md`).
A thrown error also becomes a fallback with the message of the error.

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
| `SESSION_PREFIX` | `cbws` | `slices/search/limits.ts` | Start of each session name |
| `SESSION_COUNTER_CHARS` | 2 | `slices/search/limits.ts` | Characters of the counter in a session name |
| `SESSION_RANDOM_CHARS` | 5 | `slices/search/limits.ts` | Characters of the random part of a session name |
| `SESSION_NAME_MAX` | 12 | `slices/search/limits.ts` | Longest session name |
| `MAX_DOMAINS` | 10 | `slices/search/limits.ts` | Most domains in each filter list |
| `SEARCH_URL` | `https://html.duckduckgo.com/html/` | `slices/search/limits.ts` | The search page, which needs no script and no sign-in |
| `RESULTS_SELECTOR` | `#links` | `slices/search/limits.ts` | The element of the search page that holds the results |

The browser makes a socket path under the home folder, and macOS refuses a path over 103 bytes.
This is the reason for `SESSION_NAME_MAX`.

## Why

- The plugin answers `WebSearch` in CloakBrowser and keeps the built-in tool as the fallback.
  The fallback keeps a search working when CloakBrowser gets a bot check.
- The plain headless browser gets a bot check on DuckDuckGo, Bing, Brave, Mojeek, and Startpage, so only CloakBrowser searches.
- The handler checks the permission rules itself, because an answer in `tool.call` comes before the check of Claude Code.
- The plugin uses `Bun.spawnSync` in the guide command and `$.process.run` in the handler.
  Neither uses a shell, and the arguments go as a list.
- The page of DuckDuckGo in HTML needs no script and no sign-in, so CloakBrowser can read it (`SEARCH_URL`).
- Each add-on stays a separate plugin.
- The guide bound keeps the text of the skill small in the context of the session.

## Related Pages

- [Troubleshooting](Troubleshooting): the symptoms of this plugin and their fixes.
- [Library Docs](Library-Docs): the next add-on page.
- [Attributions](Attributions): the license of `agent-browser` and of CloakBrowser.
- [Add-On Plugins](Add-Ons): the list of the add-on plugins.
