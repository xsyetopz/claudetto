---
name: explore
description: Think through an idea, problem or requirement in a project that uses OpenSpec, before or during a change. Use for "openspec explore" or "opsx explore".
---

The tool is `mcp__claudetto-openspec__openspec`. If its schema is not loaded, load it with ToolSearch `select:mcp__claudetto-openspec__openspec`.

Explore is for thinking, so keep the repo unchanged except OpenSpec artifacts the user asks for.

1. Call `{action:"status"}` to see the active changes. If the topic matches one, read its files under `openspec/changes/<name>/`.
2. Read the code and `openspec/specs/` the topic touches before you opine. Cite file and line.
3. Lay out options with what each costs and what it breaks. Say which you would pick and why. Ask one question when an answer would change the pick.
4. When a decision settles, offer to record it: in design.md for a decision, in a spec delta for a requirement, in tasks.md for work. Write it only after the user says yes.
5. When the idea is ready, suggest the propose skill, or the update skill if a change exists.
