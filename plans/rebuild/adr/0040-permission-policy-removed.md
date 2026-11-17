---
status: accepted
date: 2026-11-13
---
# Permission-Policy Requirements Removed

## Context and Problem Statement

Three D321 permission-policy requirements and one mod-architecture requirement cost more than they gave.

## Considered Options

- Keep each.
- Remove each.

## Decision Outcome

Chosen: remove the parts below.
- Each Ask and Deny Is Logged (no reader of `gate-asks/`);
- /tmp folder session markers (they stopped no delete in 58 sampled denials; none of 9,567 temp folders held one; own scratch was denied about 350 times in 3 days);
- A Test of Shipped Wording Is Denied (zero denials in 7 days);
- mod-architecture "One Owner per Responsibility" (replaced).

## Consequences

- Each removed text and test goes with it.

Source: openspec/changes/archive/2026-11-13-feat-2-1-321/specs/permission-policy/spec.md:217; openspec/changes/archive/2026-11-13-feat-2-1-321/specs/permission-policy/spec.md:225; openspec/changes/archive/2026-11-13-feat-2-1-321/specs/permission-policy/spec.md:235; openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:619; openspec/changes/archive/2026-11-10-release-2-1-319-1/specs/mod-architecture/spec.md:3.
