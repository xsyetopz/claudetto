# Handover probe (paid API)

### Arm A: never compact: handoff and clear at each task boundary

Expected: 3 clears with handoffs. Token counts and usage are the real API's.

| run | verdict | events | recall |
| --- | --- | --- | --- |
| 1 | expected 3 clears, got none | 0 clears, 0 compactions, 0 handovers | 0/10, lost q1-store q2-runtime q3-money q4-ids q5-http q6-auth q7-logs q8-tests q9-migrations q10-time |
| 2 | expected 3 clears, got none | 0 clears, 0 compactions, 0 handovers | 0/10, lost q1-store q2-runtime q3-money q4-ids q5-http q6-auth q7-logs q8-tests q9-migrations q10-time |
| 3 | expected 3 clears, got none | 0 clears, 0 compactions, 0 handovers | 0/10, lost q1-store q2-runtime q3-money q4-ids q5-http q6-auth q7-logs q8-tests q9-migrations q10-time |

| run | event | turn | ctx | request | kind | requestId | cache read | cache write 5m | cache write 1h | output |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

### Arm B25: forked handover at 25% of the window

Expected: handovers, the first at 25%. Token counts and usage are the real API's.

| run | verdict | events | recall |
| --- | --- | --- | --- |
| 1 | no handover, got none | 0 clears, 0 compactions, 0 handovers | 0/10, lost q1-store q2-runtime q3-money q4-ids q5-http q6-auth q7-logs q8-tests q9-migrations q10-time |
| 2 | no handover, got none | 0 clears, 0 compactions, 0 handovers | 0/10, lost q1-store q2-runtime q3-money q4-ids q5-http q6-auth q7-logs q8-tests q9-migrations q10-time |
| 3 | no handover, got none | 0 clears, 0 compactions, 0 handovers | 0/10, lost q1-store q2-runtime q3-money q4-ids q5-http q6-auth q7-logs q8-tests q9-migrations q10-time |

| run | event | turn | ctx | request | kind | requestId | cache read | cache write 5m | cache write 1h | output |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

### Arm B50: forked handover at 50% of the window

Expected: handovers, the first at 50%. Token counts and usage are the real API's.

| run | verdict | events | recall |
| --- | --- | --- | --- |
| 1 | no handover, got none | 0 clears, 0 compactions, 0 handovers | 0/10, lost q1-store q2-runtime q3-money q4-ids q5-http q6-auth q7-logs q8-tests q9-migrations q10-time |
| 2 | no handover, got none | 0 clears, 0 compactions, 0 handovers | 0/10, lost q1-store q2-runtime q3-money q4-ids q5-http q6-auth q7-logs q8-tests q9-migrations q10-time |
| 3 | no handover, got none | 0 clears, 0 compactions, 0 handovers | 0/10, lost q1-store q2-runtime q3-money q4-ids q5-http q6-auth q7-logs q8-tests q9-migrations q10-time |

| run | event | turn | ctx | request | kind | requestId | cache read | cache write 5m | cache write 1h | output |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

### Arm B70: forked handover at 70% of the window

Expected: handovers, the first at 70%. Token counts and usage are the real API's.

| run | verdict | events | recall |
| --- | --- | --- | --- |
| 1 | no handover, got none | 0 clears, 0 compactions, 0 handovers | 0/10, lost q1-store q2-runtime q3-money q4-ids q5-http q6-auth q7-logs q8-tests q9-migrations q10-time |
| 2 | no handover, got none | 0 clears, 0 compactions, 0 handovers | 0/10, lost q1-store q2-runtime q3-money q4-ids q5-http q6-auth q7-logs q8-tests q9-migrations q10-time |
| 3 | no handover, got none | 0 clears, 0 compactions, 0 handovers | 0/10, lost q1-store q2-runtime q3-money q4-ids q5-http q6-auth q7-logs q8-tests q9-migrations q10-time |

| run | event | turn | ctx | request | kind | requestId | cache read | cache write 5m | cache write 1h | output |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

### Arm C: built-in compaction near 140,000 tokens

Expected: a compaction near 140,000 tokens. Token counts and usage are the real API's.

| run | verdict | events | recall |
| --- | --- | --- | --- |
| 1 | no compaction, got none | 0 clears, 0 compactions, 0 handovers | 0/10, lost q1-store q2-runtime q3-money q4-ids q5-http q6-auth q7-logs q8-tests q9-migrations q10-time |
| 2 | no compaction, got none | 0 clears, 0 compactions, 0 handovers | 0/10, lost q1-store q2-runtime q3-money q4-ids q5-http q6-auth q7-logs q8-tests q9-migrations q10-time |
| 3 | no compaction, got none | 0 clears, 0 compactions, 0 handovers | 0/10, lost q1-store q2-runtime q3-money q4-ids q5-http q6-auth q7-logs q8-tests q9-migrations q10-time |

| run | event | turn | ctx | request | kind | requestId | cache read | cache write 5m | cache write 1h | output |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

### Arm D: two built-in compactions, then a handover

Expected: 2 compactions, then 1 handover. Token counts and usage are the real API's.

| run | verdict | events | recall |
| --- | --- | --- | --- |
| 1 | expected compaction, compaction, handover, got none | 0 clears, 0 compactions, 0 handovers | 0/10, lost q1-store q2-runtime q3-money q4-ids q5-http q6-auth q7-logs q8-tests q9-migrations q10-time |
| 2 | expected compaction, compaction, handover, got none | 0 clears, 0 compactions, 0 handovers | 0/10, lost q1-store q2-runtime q3-money q4-ids q5-http q6-auth q7-logs q8-tests q9-migrations q10-time |
| 3 | expected compaction, compaction, handover, got none | 0 clears, 0 compactions, 0 handovers | 0/10, lost q1-store q2-runtime q3-money q4-ids q5-http q6-auth q7-logs q8-tests q9-migrations q10-time |

| run | event | turn | ctx | request | kind | requestId | cache read | cache write 5m | cache write 1h | output |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

### Egress

- 0 requests reached the relay in 18 runs; 18 runs had a request under a host other than their own 127.0.0.1:port
- 0 connection attempts to any other host reached the proxy sink
- key: the caller's; ANTHROPIC_BASE_URL: the relay, which forwards to the real API; CLAUDE_CONFIG_DIR: a temp dir per run
- run dirs (requests.jsonl, debug-<phase>.log, stream-<phase>.jsonl): /var/folders/cl/89dcg0fs7_n4j1vbwn_cf4bm0000gn/T/probe-A-1-HcElWH /var/folders/cl/89dcg0fs7_n4j1vbwn_cf4bm0000gn/T/probe-A-2-OfTikO /var/folders/cl/89dcg0fs7_n4j1vbwn_cf4bm0000gn/T/probe-A-3-SyNbdq /var/folders/cl/89dcg0fs7_n4j1vbwn_cf4bm0000gn/T/probe-B25-1-GfOGzZ /var/folders/cl/89dcg0fs7_n4j1vbwn_cf4bm0000gn/T/probe-B25-2-YNURdV /var/folders/cl/89dcg0fs7_n4j1vbwn_cf4bm0000gn/T/probe-B25-3-9gNWX7 /var/folders/cl/89dcg0fs7_n4j1vbwn_cf4bm0000gn/T/probe-B50-1-g5ZTPE /var/folders/cl/89dcg0fs7_n4j1vbwn_cf4bm0000gn/T/probe-B50-2-36FHGa /var/folders/cl/89dcg0fs7_n4j1vbwn_cf4bm0000gn/T/probe-B50-3-0Mi1mv /var/folders/cl/89dcg0fs7_n4j1vbwn_cf4bm0000gn/T/probe-B70-1-vaAIJM /var/folders/cl/89dcg0fs7_n4j1vbwn_cf4bm0000gn/T/probe-B70-2-gtMAHO /var/folders/cl/89dcg0fs7_n4j1vbwn_cf4bm0000gn/T/probe-B70-3-EIC3K1 /var/folders/cl/89dcg0fs7_n4j1vbwn_cf4bm0000gn/T/probe-C-1-cW3v2w /var/folders/cl/89dcg0fs7_n4j1vbwn_cf4bm0000gn/T/probe-C-2-c7E9uZ /var/folders/cl/89dcg0fs7_n4j1vbwn_cf4bm0000gn/T/probe-C-3-CmZtMC /var/folders/cl/89dcg0fs7_n4j1vbwn_cf4bm0000gn/T/probe-D-1-l5uTm3 /var/folders/cl/89dcg0fs7_n4j1vbwn_cf4bm0000gn/T/probe-D-2-0XGqZC /var/folders/cl/89dcg0fs7_n4j1vbwn_cf4bm0000gn/T/probe-D-3-tj0loO
