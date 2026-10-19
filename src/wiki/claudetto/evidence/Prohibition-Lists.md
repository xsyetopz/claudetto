# Prohibition Lists

This page names the texts of the plugins that keep a prohibition list, and tells why.
Read it before you add a paragraph of `Do not` sentences to a text that a plugin sends to Claude.
The test `tests/claudetto/prompt/prohibitions.test.ts` reads the section "Kept Prohibition Lists" of this page.

## The Rule

A prohibition list is a paragraph with three or more sentences that start with `Do not`, `Don't`, `Never`, or `Avoid`.
A list of what not to do anchors the failure that it forbids (`prompt-audit.md:100` of the `claude-api` skill, copy of 2026-10-16).
So a list can stay only when its failure reproduces on the target model.
A rule that has no check becomes a hook, an allowlist, or a schema check, or it goes (`prompt-audit.md:119`).

## Kept Prohibition Lists

Task 21.5 of the OpenSpec change `claudetto-0-1-0` looked at each `.md` text under `src/plugins/` on 2026-10-16.
One paragraph had a list.
The task deleted its sentence that said again what another rule says.
The two other sentences stay, because each guards a failure that the slice saw.
No file keeps a list.
`tests/claudetto/prompt/prohibitions.test.ts` compares the texts with the list below, and fails on a new list.
An entry of the list is a line that starts with a file path in single backticks.

## Related Pages

- [Model Guidance](Model-Guidance): the official texts on prompts and false completion.
- [Probes of 2.1.301](Probes-2.1.301): answers about the plugin loader and the hook input.
- [Evidence](Evidence): the index of the evidence pages.
