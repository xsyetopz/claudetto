---
paths:
  - "justfile"
  - "tools/sandbox/**"
  - "openspec/**"
  - "**/evidence.md"
---

Run the sandbox sessions and the measurements of a package yourself, and do not give them to the user.
The user approves the use of their login in `just sandbox` and `just sandbox-alone` for this work (the user, 2026-10-13).
When a guard stops a sandbox session in a subagent, run that session from the main session (the user, 2026-10-13).
Write the results, with the method, to the evidence file of the package.
