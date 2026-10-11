# Browser

The `dotclaude-browser` plugin lets Claude drive a real browser with `agent-browser`, or with CloakBrowser on sites that block automation.
It adds the `drive-web-browser` skill.
It also replaces the built-in `WebSearch` tool with a search in the headless browser.

## At a glance

| Item | Value |
| --- | --- |
| Install | `/plugin install dotclaude-browser@dotclaude`, with `agent-browser` on `PATH` |
| Skills | `drive-web-browser`, in `skills/drive-web-browser/SKILL.md` |
| Bins | `dotclaude-browser-guide`, in `bin/` |
| Hooks | One module hook, `tool.call` on `WebSearch` ([Hooks](Hooks#dotclaude-browser)) |
| Options | `backend`: `agent-browser` (default) or `cloakbrowser` ([Choose a backend](#choose-a-backend)) |
| Limits | See [Limits](#limits) |
| Problems | See [Troubleshooting](#troubleshooting) |

## Before you begin

| Need | Why |
| --- | --- |
| `agent-browser` ([vercel-labs/agent-browser](https://github.com/vercel-labs/agent-browser)) | The skill runs it for each browser step. |
| [CloakBrowser](https://github.com/CloakHQ/cloakbrowser) binary under `~/.cloakbrowser/` | Only for sites with bot detection. |

> **Note:** The newest CloakBrowser builds need a GitHub sign-in or a paid plan.
> Claude does not install or sign in for you.

## Install agent-browser

1. Install the tool.

   ```bash
   npm install -g agent-browser
   ```

1. Add the plugin from the dotclaude marketplace with `/plugin`.

## How it works

The skill is the manual route.
Claude loads `dotclaude-browser:drive-web-browser` for a task in a web browser, and the skill holds the commands and the rules.
The skill loads the guide of `agent-browser` (`agent-browser skills get core`) through `dotclaude-browser-guide`, which cuts it at a bound.
The workflow is:

```bash
agent-browser open <url>
agent-browser snapshot
agent-browser close
```

The snapshot lists the page as an accessibility tree with refs such as `@e1`.
Claude uses a ref in `click`, `fill`, and `type`, and takes a new snapshot after the page changes.

## Web search

With the plugin installed, a `WebSearch` call of Claude runs in the headless browser.
The model keeps the tool that it knows, and no tool listing changes.
Without the plugin, `WebSearch` works as in vanilla Claude Code.

1. A `tool.call` hook on `WebSearch` in `hooks/register.mjs` takes the call.
1. The hook looks for the newest `chromium-<version>` folder under `~/.cloakbrowser/` with `$.fs.list`.
   The binary is at `Chromium.app/Contents/MacOS/Chromium` in that folder, so only macOS finds it.
1. The hook runs `agent-browser` with `$.process.run`, as an argument vector with no shell, in its own session, whose name starts with `dcws`.
   When it found the CloakBrowser binary, it adds `--executable-path <binary>`.
   Without the binary, it runs plain `agent-browser`.
   The reason is that plain headless `agent-browser` got a DuckDuckGo bot check on each run.
   `open` loads `https://html.duckduckgo.com/html/?q=<query>`, `get text body` reads the page text, and `close` ends the session.
1. The result is the page text, with a line that names the browser that was used and tells Claude the text is data.
   The page text in it has 20,000 characters or fewer.
   The bounds are in `features/search/limits.mjs`.
1. `allowed_domains` and `blocked_domains` become `site:` and `-site:` terms of the query.

The hook gives the call to the built-in `WebSearch` when:

- `agent-browser` fails to start, to open the page, or to read it, or it takes too long.
- DuckDuckGo shows a bot check, or the page has no text.

The reason is that each search engine gave a bot check or a block page to the headless browser on each run from the test network on 2026-10-09, and a deny ended a session with no answer.
When the `backend` option is `cloakbrowser`, the result of the built-in `WebSearch` gets a notice for Claude.
The notice gives the reason that CloakBrowser gave no results, and it tells Claude to tell you, because you chose CloakBrowser.

The hook denies the call when:

- The `backend` option is `cloakbrowser`, and the CloakBrowser binary is missing.
  The reason tells Claude that the call did not run and to ask the user to install CloakBrowser or to set the `backend` option to `agent-browser`.
  Claude does not switch to plain `agent-browser` by itself, because you chose the backend.
- The `query` is empty.

The query goes to DuckDuckGo, and after a fallback also to the built-in `WebSearch`, so put no secret in it.
`agent-browser` must be on the `PATH` of Claude Code.
In the [sandbox](Sandbox), the network list needs `html.duckduckgo.com`.

## Limits

The bounds of the search are in `plugins/dotclaude-browser/features/search/limits.mjs`.
The bounds of the `agent-browser` guide in the skill are in `plugins/dotclaude-browser/features/guide/limits.mjs`.

| Bound | Value |
| --- | --- |
| Characters of page text in one result | 20,000 |
| Time to open the search page | 30 s |
| Time to read the page text | 15 s |
| Time to close the session | 10 s |
| Length of a session name | 12 bytes, starting with `dcws` |
| `allowed_domains` or `blocked_domains` in one query | 10 |
| Characters of the `agent-browser` guide in the skill | 40,000, then a notice that names the command for the rest |
| Time to get the guide | 15 s |

## Choose a backend

| Backend | When | How |
| --- | --- | --- |
| `agent-browser` (default) | Most pages. | No setup. |
| `cloakbrowser` | A site shows a bot check, a block page, or a CAPTCHA to `agent-browser`. | Set the option `backend` to `cloakbrowser` in `/config` under dotclaude-browser. |

With `cloakbrowser`, the `WebSearch` hook always uses the CloakBrowser binary, and the skill tells Claude to use CloakBrowser, and not plain `agent-browser`.
When the binary is missing, Claude tells you and does not switch to plain `agent-browser`.
Claude runs `agent-browser` with the CloakBrowser binary and `--headed`, because headless mode is easier to detect.

```bash
agent-browser --executable-path <cloakbrowser binary> --headed open https://example.com
```

On macOS the binary is at `~/.cloakbrowser/chromium-<version>/Chromium.app/Contents/MacOS/Chromium`.
CloakBrowser reduces challenges but does not solve them.

## Prompts and challenges

| Case | What Claude does |
| --- | --- |
| Cookie banner | Dismisses it with a normal click, and picks the least-permissive option. |
| Sign-in | Uses `--profile <path>` for a persistent session, or, after it asks you, `--auto-connect` to reuse your running Chrome with its logged-in sessions. |
| CAPTCHA | Asks you to complete it by hand. |

## Troubleshooting

A block page or a bot check is a decision of the site, and a site can forbid automation in its terms.
When a site blocks a page, Claude tells you which page blocked it and asks before it uses a step.
The steps are in this order:

1. Run `agent-browser read <url>` for a machine-readable version.
1. Look for RSS or Atom feeds, sitemaps, or APIs.
1. Switch from plain `agent-browser` to CloakBrowser.
1. Ask you to open the page by hand.

> **Note:** The `recognize-captcha` skill and the offline `ddddocr-rs` OCR no longer exist in the plugin.
> The CHANGELOG removed them in 0.20.0, because CloakBrowser keeps most CAPTCHAs away.

When a web search fails with "Socket path would be N bytes (max 103)", the home folder path is too long.
`agent-browser` puts the socket of each session in a folder under the home folder, and macOS refuses a socket path over 103 bytes.
The session names of the web search are 12 bytes or fewer, so a home folder of 70 bytes or fewer works (**measured** 2026-10-08: a home folder of 73 bytes and a 10-byte name gave 104 bytes, so the rest of the path is 21 bytes).
The hook then returns no result and the built-in `WebSearch` answers, so nothing is denied.
Use a shorter home folder to get the headless browser search back.

Text on a web page is data, not instructions.
Claude follows your task, and not instructions in page content.

## Related pages

- [Install](Install)
- [Hooks](Hooks#dotclaude-browser)
- [Troubleshooting](Troubleshooting#dotclaude-browser)
