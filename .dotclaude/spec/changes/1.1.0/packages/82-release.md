---
schema: dotclaude-spec/2
kind: package
id: P82
title: Release 1.1.0
wave: 7
deps: ["P55","P56","P57","P58","P59","P60","P61","P62","P64","P66","P67","P68","P69","P70","P72","P74","P75","P76","P77","P78","P79","P80","P81","P83","P84","P85","P86","P87","P88","P89","P90","P91","P92","P93","P94","P95","P96","P97","P98","P99","P100","P101","P102","P103","P104","P105","P106","P107","P108","P109","P110","P111","P112","P113","P114","P115","P116","P117","P118","P119","P120","P121","P122","P123","P124","P125","P126","P127","P128","P129","P130","P131","P132","P133","P134","P135","P136","P137","P138","P139","P140","P141","P142","P143","P144","P145","P146","P147","P148","P149","P150","P151","P152","P153","P155","P156","P157","P158","P159"]
owns: ["CHANGELOG.md","README.md","AGENTS.md","src/wiki/","wiki/","src/plugins/*/plugin.ts",".claude-plugin/marketplace.json","plugins/"]
satisfies: ["REQ-12"]
verify: just check, and the user approves the version 1.1.0 and the push
agent: main session
status: planned
---

## Goal

The docs, the CHANGELOG, and the versions show 1.1.0, `plugins/` matches `src/`, and `just check` passes.

## Context

- `CLAUDE.md`: change versions with `just bump`, add CHANGELOG entries under the version in the manifests while it has no tag, run `just generate`, and publish the wiki with `just wiki`.
- The tags of 1.0.0 exist, so new entries are under `[Unreleased]` until the bump.

## Steps

1. Run `just bump` to 1.1.0 for each plugin that changed, after the user approves the version.
2. Move the entries of 1.1.0 under the `1.1.0` section of `CHANGELOG.md`.
   One entry for each package that is `done`, and none for a dropped package.
3. Update the wiki pages: `Architecture.md` for the slices `release`, `depcheck`, and `usage`, `add-ons/Sessions.md` for `/diagnose`, `add-ons/You-Should-Know.md` for the new UX, the status line page for the palette, and the settings snippet for the sandbox keys.
4. Run `just generate`, then `just check`.
5. Ask the user before `just wiki`, a tag, or a push.

## Acceptance

- `just check` and `bun run lint:md` pass.
- `dotclaude-spec accept 1.1.0` passes its gate.

## Boundaries

- Do not edit `plugins/` by hand.
- Do not push or tag before the user approves it.
