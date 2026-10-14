---
schema: dotclaude-spec/2
kind: package
id: P75
title: Dependency add check (I08)
wave: 3
deps: []
owns: ["src/plugins/dotclaude/slices/depcheck/","tests/dotclaude/depcheck/"]
satisfies: ["REQ-9"]
verify: just test tests/dotclaude/depcheck && just lab
agent: implementer
status: planned
---

## Goal

A command that adds a dependency stops when the package does not exist, and asks when the package is newer than a bound.

## Context

- The I08 row of `00-INDEX.md`: "registry allowlists, lockfiles".
  Its section is in `03-safety-and-trust-boundaries.md`.
- The registries in the sandbox allowlist: `registry.npmjs.org`, `pypi.org`, and `crates.io` (`prompt/slice.ts:109-120`).
- The add commands: `npm install <name>`, `bun add`, `pnpm add`, `yarn add`, `pip install`, `uv add`, and `cargo add`.

## Steps

1. Read the I08 section, and cite it in `slice.ts`.
2. Find the mod API call that can reach a registry from a hooks module, such as a fetch API or `$.process.run`.
   If none can, stop and report to the parent.
3. Parse the add commands into package names in `domain/`, and skip a local path, a git URL, and a name in the lockfile.
4. Deny a name that the registry does not have, and ask for a package whose first release is newer than `MIN_PACKAGE_AGE_DAYS` in `depcheck/limits.ts`.
5. A failed or slow registry call lets the command run.
6. Tests: each command form, a missing package, a new package, an old package, a lockfile name, and a failed call.

## Acceptance

- `just test tests/dotclaude/depcheck` and `just lab` pass.

## Boundaries

- No model call.
- Do not add a registry to the sandbox allowlist.
