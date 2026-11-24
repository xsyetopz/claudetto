# Reverify on Claude Code 2.1.331

Each probe reruns a REQ's Verified check on Claude Code 2.1.331 (`claude --version`, 2026-11-24).
`probe.sh <name> <git|nogit> <prompt> [claude args]` starts one headless session with all three
plugins in a fresh folder that `setup/<name>.sh` fills. It writes the stream-json transcript to
`$REVERIFY_OUT/<name>.jsonl`.

`--setting-sources project` keeps user settings out of a probe, so the allow rules that the claudetto
settings fill writes to user settings are passed with `--settings`. The stream-json transcript does
not carry the context a `tool.call` hook adds, so a probe of such a note asks the model to quote it.

| Probe | REQ | Result |
| --- | --- | --- |
| edit-ten, edit-nogit | REQ-EDIT-001 | 10 renames in one `perl -pi -e` call, no prompt, in and out of git |
| edit-quote | REQ-EDIT-002 | the model quoted the diff stat and the re-Read step |
| edit-quote-nogit | REQ-EDIT-002 | the model quoted "Diff stat unavailable outside git" |
| clear (cc-inspect) | REQ-HANDOVER-020 | 4 requests; request 3 is the low-effort fork; request 4 opens with the handover block |
| compact (cc-inspect) | REQ-HANDOVER-056 | summarizer requests carry `cache_control` and no `ttl`, so a 5 m write |
| wall (cc-inspect) | REQ-GUARDS-076 | sandbox on: 4 bypass writes refused; sandbox off: all 4 reach the walled file |
| sandbox (cc-inspect) | REQ-SETUP-058 | with the sandbox block a file-creating Bash call runs with no prompt; without it, refused |
| zsh (cc-inspect) | REQ-KERNEL-014 | vanilla: word split fails (rc 127), `PIPESTATUS` empty; claudetto: both work |
| `steady.ts` | REQ-SETUP-011, REQ-SETUP-033, RISK-536 | launch 2 on the claudetto-written settings: no builtin skill, 9 tools, none of the seven denied; no "not matched" rule warning |
| `reply.sh` | REQ-REPLY-108, REQ-REPLY-109 | `AskUserQuestion` vanilla 0/6; description placement 3/6 on the test-runner prompt; style placement 9/9 |

`steady.ts` runs two `claude -p hi` launches in one fresh `CLAUDE_CONFIG_DIR` against the fake API, so
the second binds the user settings that the claudetto fill wrote in the first. `reply.sh` drives
`claude -p --permission-prompt-tool stdio` through `reports/2026-11-19-research/risks-reply/drive.py`,
which answers each `AskUserQuestion` with its first option; the 33 Sonnet 5.5 runs cost about $3.
