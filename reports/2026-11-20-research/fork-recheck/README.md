# Handover Fork Recheck on Later Releases

RISK-507, issue #64. On 2.1.327 the handover fork (`$.model.fork`) resends the parent's last message as a plain string, while the parent sent it as a one-block list with `cache_control`, so the cache prefix ends one message early. The paid runs of issue #60 measured the cost.

`run.sh <claude-binary> <port>` checks the cause for free: a fake API stub (`tick-rerun/ctx/stub.ts`) logs request bodies while `plugin839` calls `$.model.fork` after a one-line first answer. `cmp.py` compares the parent's last message with the fork's copy of it.

## Run, 2026-11-20

| Version | Parent's last message | Fork's copy | Same bytes |
| --- | --- | --- | --- |
| 2.1.327 | list of 1, `cache_control` | string | no |
| 2.1.328 | list of 1, `cache_control` | string | no |
| 2.1.329 | list of 1, `cache_control` | string | no |

2.1.327 and 2.1.329 were run twice with the same result. 2.1.327 reproduces the shape the paid runs traced, which shows that the check detects the fault. 2.1.328 and 2.1.329 still show it, so RISK-507 stays transferred and #64 stays open.
