---
paths:
  - "justfile"
  - "package.json"
  - "plugins/**"
  - "tests/**"
  - "tools/**"
---

Commands at the repository root:

- `just docker check` runs `just check` in a container on OrbStack or Docker, with at most `DOCKER_CPUS` CPUs (`tools/limits.ts`).
  `just docker test tests/claudetto/guard/gate.test.ts` runs one recipe the same way.
  Use it for the checks, so that they do not take each CPU of the host.
  The sandbox sessions and the paid runs use the login of the host, so they do not run in the container.
- `just test tests/claudetto/guard/gate.test.ts` runs one test file with `bun test`.
- `just lab` runs the hook lab of each plugin: the tests of its hooks module with stubbed Claude Code events.
  Test each change to `hooks/register.ts` there before a live session.
- `just sandbox` runs Claude Code with this checkout in a separate config.
  Read `wiki/claudetto/development/Sandbox.md` first.
