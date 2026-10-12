// Helpers of the CLI tests: a fixture store in a temporary folder, and a run of `main` with captured output.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { main } from "../../../../src/plugins/dotclaude/slices/spec/adapters/cli.ts";

export const TODAY = "2026-10-12";

/** A new temporary folder with the `files`, which map a relative path to a text. */
export const makeStore = (files: Record<string, string> = {}): string => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "spec-cli-"));
  for (const [rel, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    fs.writeFileSync(path.join(root, rel), text);
  }
  return root;
};

export const read = (root: string, rel: string): string =>
  fs.readFileSync(path.join(root, rel), "utf8");

export const has = (root: string, rel: string): boolean =>
  fs.existsSync(path.join(root, rel));

export interface Outcome {
  code: number;
  out: string[];
  err: string[];
}

/** Runs `dotclaude-spec args` in `cwd` with a fixed clock. */
export const run = async (cwd: string, ...args: string[]): Promise<Outcome> => {
  const out: string[] = [];
  const err: string[] = [];
  const code = await main(
    args,
    cwd,
    { log: (l) => out.push(l), error: (l) => err.push(l) },
    { now: () => new Date(`${TODAY}T10:00:00.000Z`) },
  );
  return { code, out, err };
};

export const stateText = (lanes: Record<string, string>): string =>
  `${JSON.stringify({ schema: 1, lanes, events: [], handoff: null }, null, 2)}\n`;

export const brief = (
  id: string,
  deps: string[],
  owns: string[],
  extra = "",
): string => `---
id: ${id}
deps: [${deps.join(", ")}]
owns: [${owns.map((o) => `"${o}"`).join(", ")}]
verify: just test
agent: implementer
---

# ${id}

## Goal

Goal of ${id}.${extra}

## Context

- Context.

## Steps

1. Step.

## Acceptance

- Accept.

## Boundaries

- Bound.
`;

export const SPEC = `# Store

## Requirements

### Requirement: Alpha
The store SHALL keep alpha.

#### Scenario: Keep
- **WHEN** alpha is set
- **THEN** alpha is kept
`;

export const DELTA_ADD_BETA = `# Store

## ADDED

### Requirement: Beta
The store SHALL keep beta.

#### Scenario: Keep beta
- **WHEN** beta is set
- **THEN** beta is kept
`;

export const DELTA_REMOVE_MISSING = `# Store

## REMOVED

### Requirement: Missing
`;
