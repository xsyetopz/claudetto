# Handover Fork Recheck on Later Releases

RISK-507, issue #64. On 2.1.327 to 2.1.330 the engine sends its role-system block (messages[1], about 4,200 tokens) as a one-block list with `cache_control` on the first request and as a string afterwards, the handover fork (`$.model.fork`) included. The API does not serve the string from the list's cache entry, so a fork after exactly one main-thread request reads about 4,200 tokens uncached. A string user message as the last message costs no more than 27 tokens. claudetto's `writeHandover` skips the fork for a one-prompt, one-reply conversation (the `ENGINE(v2.1.330)` branch in `plugins/claudetto/hooks/handover/writer.ts`).

`run.sh <claude-binary> <port>` checks it for free: a fake API stub (`tick-rerun/ctx/stub.ts`) logs request bodies while `plugin839` calls `$.model.fork` after a one-line first answer. `cmp.py` compares messages[1] of the parent and of the fork and exits 1 while they differ. When a release prints `same bytes: True`, the engine fault is gone: remove the `ENGINE(v2.1.330)` branch and its tests, and close #64.

## Run, 2026-11-21 (2.1.330)

| Version | messages[1] in the parent | in the fork | Same bytes |
| --- | --- | --- | --- |
| 2.1.330 | list of 1, `cache_control` | string | no |

The earlier runs of 2026-11-20 (2.1.327 to 2.1.329) compared the parent's last message, which is messages[1] when the session has made one request, and showed the same shape change.

Paid Haiku 5.5 runs, 2.1.330: a fork after the first request read 14,987 of 19,195 tokens (4,208 missed, 3 of 3 runs, and 4,208 again with a first prompt 6,900 tokens longer); after the second request a fork missed 27 of about 26,000 tokens.
