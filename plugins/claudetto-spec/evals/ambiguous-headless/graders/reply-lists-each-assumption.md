---
type: llm
focus: last_message
weight: 2
---

# Each Assumption Reported

The request leaves two things unstated: the form of the tax rate (a fraction such as 0.08 or a percentage such as 8) and how the result is rounded.

PASS if the reply reports the form of the tax rate and the rounding it chose, each one presented as a choice made without the user (in any wording, such as "assumed", "chose", "my reading", "default"), or as a question left open for the user.
FAIL if either of the two is missing, or appears only as a plain description of what the code does, with nothing that marks it as an unconfirmed choice.
