# Proposal: post-0-2-0

## Why

Version 0.2.0 is released and tagged (`claudetto--v0.2.0` and the five add-on tags).
Eight changes were finished, and their folders are deleted from the tree: `builtins-0-2-0`, `cc-2-1-304`, `cc-2-1-305`, `evals-redesign-0-2-0`, `release-0-2-0`, `spec-workflow-0-2-0`, `trim-0-2-0`, and `wiki-0-2-0`.
They stay in git at the tag `claudetto--v0.2.0`.
Some work in them stayed open, or was noted as a follow-up.
This change collects that work in one place.

## What Changes

- Docs: the token sizes of the spec profiles, the `ground` replay numbers, and the check of the `Goal` page.
- Prompts: remove a token count from a text for the model, pin the `@fission-ai/openspec` version in the `spec` skill, and audit the `epic` and `task` presets.
- Sandbox: the Linux fallback for `docker *`, and a user doc for the accepted Docker socket risk.
- Guard: a rule for a delete refspec of `git push`, or a rewrite of the ask rule.
- Paid evals, each one after the user agrees to its cost.

## Evidence

`evidence.md` copies the parts of the deleted folders that these tasks need.

## Specs

`openspec/specs/` holds the requirements that `release-0-2-0` proposed and that stay true: `jscpd`, `evals`, `hook-messages`, and `settings-snippet`.
This change adds no requirement.

## Out of Scope

- A new feature.
  This change closes the open work of 0.2.0 only.
