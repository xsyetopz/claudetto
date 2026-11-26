---
status: superseded by ADR-0159
date: 2026-11-09
---
# Sandbox Deny List as First Written

## Context and Problem Statement

The first sandbox block of 2.1.319 wrote no `enableWeakerNetworkIsolation`. A later rewrite (4.1) and the current spec write it.

## Considered Options

- No `enableWeakerNetworkIsolation`, as first written.
- `enableWeakerNetworkIsolation: true` and `allowMachLookup ["*"]`.

## Decision Outcome

Chosen: Superseded. The first form is not shipped; see sandbox-weaker-network-isolation.

## Consequences

- The first form made `gh api user` fail with x509 OSStatus -26276.

Source: openspec/changes/archive/2026-11-09-release-2-1-319/specs/sandbox/spec.md; openspec/specs/sandbox/spec.md:15; openspec/specs/sandbox/spec.md:63.
