---
schema: dotclaude-spec/2
kind: package
id: P156
title: Prompt surface: plugin descriptions and userConfig
wave: 6
deps: ["P126","P127","P128","P129","P130","P131","P132"]
owns: ["the description and userConfig keys of src/plugins/*/plugin.ts",".dotclaude/spec/changes/1.1.0/evidence/surface-manifests.md"]
satisfies: ["REQ-23"]
verify: just validate && just check
agent: implementer
status: planned
---

## Goal

The description of each plugin and each `userConfig` description follow the guidance of Anthropic.

## Context

- `src/plugins/*/plugin.ts`: the manifest source of each of the 8 plugins.
- The prompt-audit guide `.claude/skills/claude-api/shared/prompt-audit.md`, and `.claude/skills/claude-api/shared/model-migration.md`, read from disk.
- `.claude/rules/ste-messages.md`.

## Steps

1. List each description and each `userConfig` description with `file:line`, and run the prompt-audit flow on each one.
   Write it and a proposed diff to the evidence file.
2. Rewrite each one: what the plugin or the option does, and when a user changes it.
3. Run `just generate`.

## Acceptance

- The verify command passes.

## Boundaries

- Do not change a version, which P82 owns.
- Do not change the default of an option.
