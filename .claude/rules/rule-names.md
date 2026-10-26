---
paths:
  - "plugins/*/hooks/register.ts"
  - "plugins/*/evals/hooks.json"
---

`hooks/register.ts` has one literal `on("<event>", handler)` call for each rule, in the order in which the rules run, and only `register.ts` calls `on(`.
A `// rule: <module>.<job>` comment above each call names the rule, and the keys of `evals/hooks.json` are these rule names.
A new rule needs a new `on()` call, a new key in `evals/hooks.json`, and a test in the hook lab (`just lab`).
