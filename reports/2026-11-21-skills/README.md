# Skills probe: `agent:` resolution and the listing line (REQ-SKILLS-001)

Claude Code 2.1.330, 2026-11-21. No paid calls: each run is `claude -p` against the fake API of
`tools/measure-tools/fake-api.ts` (`startFakeApi(false)`), an empty `CLAUDE_CONFIG_DIR`, and a
throwaway plugin named `claudetto` holding only `agents/` (copied from `plugins/claudetto/agents`)
and, in the runs that need it, `skills/review/SKILL.md`. The fake API records each request body.
The probe plugin has no hooks, so the figures are the engine's, not the plugin's hooks'.
The user's `skillListingMaxDescChars: 60` is not in the empty config, so listing lines here are
uncut; a cut would only shorten the one line measured.

The skill under probe (the description was later shortened to the shipped text; the probe line is
the 90-byte figure below):

```yaml
name: review
description: Run when asked to review the uncommitted diff for bugs. Defects only.
disable-model-invocation: true
context: fork
agent: claudetto:Athena
```

## (a) Does `agent: claudetto:Athena` resolve under `context: fork`

- Hypothesis: the fork starts a subagent of the plugin agent type, with Athena's prompt and tools.
- Check: `claude -p "/claudetto:review"`; read the request the fork sends.
- Result: yes. The run made one request with 3 tools (`Read`, `Grep`, `Glob`, Athena's
  `tools:` line), a system prompt containing Athena's body ("Sweep the change or system you are
  given"), and the skill body ("Review the working diff") in the messages. The main loop's
  request (`hi`) carries 12 tools. No error on stderr.
- Limit: the fake API answered "ok", so the fork's tool use and its reply to the main loop were not
  exercised. Resolution is shown by the request; behavior is for the eval.

## (b) Does `disable-model-invocation: true` add a listing line

- Hypothesis: a model-invisible skill adds nothing to the model's skill listing.
- Check: three plugin variants, prompt `hi`, compare the skill-listing block of request 1
  ("The following skills are available for use with the Skill tool"). The third variant is the
  control: the same skill without `disable-model-invocation`.
- Result:

| Variant | Skill lines | Listing bytes | First request messages bytes |
| :- | -: | -: | -: |
| no skill | 12 | 5,889 | 8,609 |
| `review` with `disable-model-invocation: true` | 12 | 5,889 | 8,609 |
| `review` without it (control) | 13 | 5,979 | not recorded |

The control adds `- claudetto:review: Run when asked to review the uncommitted diff for bugs.
Defects only.`, 90 bytes with its newline. The disabled command adds 0 bytes. The 12 lines are
the engine's bundled skills (this empty config has `disableBundledSkills` unset). The agent
listing (`claudetto:Athena` and the others) is the same with and without the disabled command.

## Consequence

`/claudetto:review` can name `agent: claudetto:Athena` and costs no listing bytes. The menu line the
user sees (60-character cut) is separate from the model's listing and was not measured.
