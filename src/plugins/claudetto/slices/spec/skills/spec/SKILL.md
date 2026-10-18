---
name: spec
description: Picks a preset schema (`task`, `story`, or `epic`) for an OpenSpec change and hands off to the `/opsx:*` commands.
disable-model-invocation: true
argument-hint: "[task|story|epic] [change]"
---

Pick a preset, and hand off.
Do no other workflow step.

## Setup

Never overwrite a file.

- If `openspec/` is missing, run `bunx @fission-ai/openspec init --tools claude --profile core`.
- For each folder `${CLAUDE_SKILL_DIR}/schemas/<preset>`, copy it to `openspec/schemas/<preset>` only when that folder is missing.
- Copy `${CLAUDE_SKILL_DIR}/config.yaml` to `openspec/config.yaml` only when that file is missing.
- Read the global config with `bunx @fission-ai/openspec config list`.
  If `delivery` is `both`, each workflow is listed twice.
  If `verify` is not in `workflows`, `/opsx:verify` is missing.
  The global config is outside the project, so ask the user before you change it.
  Give the commands `bunx @fission-ai/openspec config set delivery skills` and `bunx @fission-ai/openspec config profile`.

## Preset

State the facts that you used.
Use the first rule that fits.

- The user names a preset: that preset.
- No `openspec/specs/` and a near-empty repository: `epic`.
- The change has no change of behavior: `task`.
- The change touches one capability: `story`.
- Unsure: `story`, and ask the user.

## Hand Off

Run `/opsx:propose`, and name the schema `<preset>`, so that it runs `new change <change> --schema <preset>`.
The schema `task` sets `skip_specs` itself.
Then point the user to `/opsx:apply`, `/opsx:verify`, and `/opsx:archive`.
