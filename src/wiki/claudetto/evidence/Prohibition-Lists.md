# Prohibition Lists

A prohibition list is a paragraph of three or more sentences that start with `Do not`, `Don't`, `Never`, or `Avoid`.
A list of what not to do anchors the failure that it forbids.
So `claudetto` keeps such a list only when its failure reproduces on the target model.

## The Rule

- A list can stay only when its failure reproduces on the target model.
- A rule with no check becomes a hook, an allowlist, or a schema check, or it goes.
- The source is `prompt-audit.md:100` and `:119` of the `claude-api` skill (copy of 2026-10-16).

## Kept Prohibition Lists

No text under `plugins/` keeps a list.
On 2026-10-16, one paragraph had a list.
One sentence said again what another rule says, so it was deleted.
The two other sentences stay, because each guards a failure the slice saw.


## Related Pages

- [Model Guidance](Model-Guidance)
- [Probes 2.1.301](Probes-2.1.301)
- [Evidence](Evidence)
