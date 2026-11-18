# Scope And Simplicity

- [ ] **CC-075** claudetto shall hunt defects and hold scope: run existing tests before and after a change (a regression shows as its own); look for siblings in the same code and the same pattern elsewhere; investigate surprising state (empty data, a failing baseline) before repairing it; report a defect in work another live session owns via `SendMessage` (present in 2.1.327, chunk-77827yq1.js@822); change only the files the task names plus each caller and test the named change breaks; repo habits (an `off` switch beside each paid option, a CHANGELOG line per change) are not a reason to widen scope.
  Acceptance: a change touches only named files plus broken callers and tests. Verification: inspection.
  Basis: reported. Status: partial at 088a227c.
  Source: external/please-use-me-often/agent-failure-dossier/judged/setting.jsonl:36; external/please-use-me-often/agent-failure-dossier/judged/conduct.jsonl:23.

- [ ] **CC-076** claudetto shall ask for the smallest diff that satisfies the task and a list of what was not added; review with "what does this generality buy today?" and abstract on the third repetition; give jscpd, radon, and ESLint complexity as PostToolUse feedback; anchor with "use existing X for Y"; point at code to copy for UI, not adjectives; before a new file format or feature module check documented extension points ("Rule of Least Power"); keep a file-length lint.
  Acceptance: a diff review lists what was left out. Verification: inspection.
  Basis: reported. Status: partial at 088a227c (`.jscpd.json` and the jscpd rule in `AGENTS.md:38` exist; no PostToolUse feedback, per `git grep -n PostToolUse 088a227c -- plugins/claudetto` finding nothing).
  Source: external/please-use-me-often/swe-best-practices.md:26.

- [ ] **CC-077** claudetto shall keep one path per job and no own formats or copies: an own eval harness (`case.json`, hidden oracle folders, tamper hashes, `runs.json`) was later banned by the owner (never use or invent proprietary schemas or formats); `.claude/dotclaude-rules.json` was proposed and dropped; four hand-written shell parsers with different wrapper lists left one missing `timeout 5 git reset --hard`; two hook runtimes; a regex Stop check with 5 tests was built and deleted for the existing prompt hook the same hour.
  Acceptance: each job names its one path. Verification: inspection.
  Basis: reported. Status: partial at 088a227c.
  Source: external/please-use-me-often/agent-failure-dossier/04-engineering-delegation-and-cost.md:37.

- [ ] **CC-078** The agent invents no file, format, schema, order, priority, or wording that the user did not give, and finishes the named task before anything else.
  Acceptance: output holds no numbered order without a user list behind it. Verification: inspection.
  Basis: reported. Status: missing at 088a227c.
  Source: reported, user, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:11008); reported, user, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:8179).
