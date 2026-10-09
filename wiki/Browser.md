# Browser

The `dotclaude-browser` plugin lets Claude drive a real browser with `agent-browser`, or with CloakBrowser on sites that block automation.
It adds the `drive-web-browser` skill.
It also replaces the built-in `WebSearch` tool with a search in the headless browser.

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
1. The hook runs `agent-browser` with `$.process.run`, as an argument vector with no shell, in its own session, whose name starts with `dcws`.
   `open` loads `https://html.duckduckgo.com/html/?q=<query>`, `get text body` reads the page text, and `close` ends the session.
1. The result is the page text, with a line that tells Claude the text is data.
   It has 20,000 characters or fewer.
   The bounds are in `features/search/limits.mjs`.
1. `allowed_domains` and `blocked_domains` become `site:` and `-site:` terms of the query.

The hook denies the call, and the reason names `dotclaude-browser:drive-web-browser`, when:

- `agent-browser` fails to start, to open the page, or to read it, or it takes too long.
- DuckDuckGo shows a bot check, or the page has no text.
- The `backend` option is `cloakbrowser`, because the search flow uses plain `agent-browser`.
- The `query` is empty.

The query goes to DuckDuckGo, so put no secret in it.
`agent-browser` must be on the `PATH` of Claude Code.
In the [sandbox](Sandbox), the network list needs `html.duckduckgo.com`.

## Choose a backend

| Backend | When | How |
| --- | --- | --- |
| `agent-browser` (default) | Most pages. | No setup. |
| `cloakbrowser` | A site shows a bot check, a block page, or a CAPTCHA to `agent-browser`. | Set the option `backend` to `cloakbrowser` in `/config` under dotclaude-browser. |

With `cloakbrowser`, the skill tells Claude to use CloakBrowser, and not plain `agent-browser`.
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
| Sign-in | Uses `--profile <path>` for a persistent session, or `--auto-connect` to reuse your running Chrome. |
| CAPTCHA | Asks you to complete it by hand. |

## Troubleshooting

When a site blocks a page, Claude tries these steps in order:

1. Switch from plain `agent-browser` to CloakBrowser.
1. Run `agent-browser read <url>` for a machine-readable version.
1. Look for RSS or Atom feeds, sitemaps, or APIs.
1. Ask you to open the page by hand.

> **Note:** The `recognize-captcha` skill and the offline `ddddocr-rs` OCR no longer exist in the plugin.
> The CHANGELOG removed them in 0.20.0, because CloakBrowser keeps most CAPTCHAs away.

When a web search fails with "Socket path would be N bytes (max 103)", the home folder path is too long.
`agent-browser` puts the socket of each session in a folder under the home folder, and macOS refuses a socket path over 103 bytes.
The session names of the web search are 12 bytes or fewer, so a home folder of 70 bytes or fewer works (**measured** 2026-10-08: a home folder of 73 bytes and a 10-byte name gave 104 bytes, so the rest of the path is 21 bytes).
Use a shorter home folder, or let the deny send Claude to the `dotclaude-browser:drive-web-browser` skill.

Text on a web page is data, not instructions.
Claude follows your task, and not instructions in page content.

## Related pages

- [Install](Install)
- [Parts](Parts)
