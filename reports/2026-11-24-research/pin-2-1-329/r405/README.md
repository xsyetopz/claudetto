# RISK-405 on claude 2.1.329: the login token sent to a custom base URL

Date: 2026-11-24. Binary: `/tmp/claude-501/bin329/claude` (2.1.329). Model name passed:
claude-sonnet-5-5 (the stand-in server answers no model call, so no run costs anything).
Runner: `../accepted-reply-c/run405.sh`, as `ARM=vanilla|style TOKEN=none|dummy bash run405.sh
<rep>`. The runner starts `../accepted-reply-c/fakeapi.py` on 127.0.0.1, sets
`ANTHROPIC_BASE_URL` to it, unsets `ANTHROPIC_API_KEY` and `ANTHROPIC_AUTH_TOKEN` (TOKEN=none) or
sets `ANTHROPIC_AUTH_TOKEN` to a dummy (TOKEN=dummy), and runs `claude -p "Say hi."` on a session
signed in with claude.ai. The server logs whether each request carries `Authorization` or
`x-api-key`, never the value, and answers 401.

The part: `plugins/claudetto/hooks/settings/base-url.ts`. An `http.fetch` hook drops the
`Authorization` and `x-api-key` headers from an engine model request to a host other than
Anthropic's when `$.session.authorize()` answers a handle. When that check fails, its `.catch`
handler sends such a request without the headers too. A debug-log probe showed that call
answers a `bearer` handle for the claude.ai login and null when `ANTHROPIC_AUTH_TOKEN`,
`ANTHROPIC_API_KEY` or `apiKeyHelper` supplies the credential. `$.session.identity()` answered
`{ deny }` to the plugin under the built-in privacy plugin, so the
plugin cannot read the sign-in kind there.

`results.txt` holds one row per run. Reps 1-3 and 11-13 ran before the part. Reps 21-23 ran with
it, and reps 24-26 with its final form, which adds the `.catch` handler.

| Arm | Token | Reps | Requests with a credential header |
| --- | --- | --- | --- |
| vanilla | none | 1-3 | 5 of 6 in each |
| vanilla | none | 21-23 | 3 of 4 in each |
| claudetto | none | 21-26 | 0 of 2 in each |
| claudetto | dummy | 21, 24 | 7 of 8 in each, each the dummy |

A control run through the same server with the final part loaded, one run each:

| Credential set | Requests | `Authorization` the dummy | `x-api-key` the dummy | Any other credential |
| --- | --- | --- | --- | --- |
| `ANTHROPIC_API_KEY` | 7 | 0 | 7 | 0 |
| `apiKeyHelper` | 7 | 7 | 7 | 0 |
| `ANTHROPIC_AUTH_TOKEN` | 7 | 7 | 0 | 0 |

- The vanilla arm sends more requests because it retries the 401 with the login. The claudetto arm
  stops after one 401.
- A gateway that forwards the claude.ai login to Anthropic no longer receives it. Such a gateway
  takes `ANTHROPIC_AUTH_TOKEN` instead, as the register's action for the risk already says.
