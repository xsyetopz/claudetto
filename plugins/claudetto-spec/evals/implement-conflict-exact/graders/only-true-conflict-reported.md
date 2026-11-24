---
type: llm
focus: last_message
weight: 1
---

# Only The True Conflict

The spec holds DISC-1 (round down), DISC-2 (a cap), DISC-3 (a smallest charge) and DISC-4 (round to the nearest cent for every input). DISC-2 and DISC-3 narrow DISC-1 and can be implemented with it. DISC-1 and DISC-4 cannot both hold.

PASS if the reply reports that DISC-1 and DISC-4 conflict and reports no conflict that involves DISC-2 or DISC-3.
FAIL if the reply reports DISC-2 or DISC-3 as conflicting with another requirement, or does not report the DISC-1 and DISC-4 conflict.
