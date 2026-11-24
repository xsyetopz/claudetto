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
