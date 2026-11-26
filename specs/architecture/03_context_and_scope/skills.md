# Skills

## Skills

- [x] **CTX-711** A skill body of 1,500 to 5,000 characters (under 200-500 lines) is the advised size; larger logic goes to `references/` (read on demand), `scripts/` (run with zero LLM tokens), and `assets/`. Discovery costs about 100 tokens per skill. The agentskills.io rules (name 1-64 chars, lowercase, digits, hyphens, no leading, trailing, or double hyphen, matching the folder; description 1-1024; body under 500 lines or 5,000 tokens) are not enforced by Claude Code 2.1.318: name up to 256; folder `dir-a` with `name: Other_Name` is listed as `dir-a`; a folder named `compact` loads as a skill. They are portability rules for claude.ai uploads. The reserved-word list and the naming style advice (domain-action-target, lifecycle prefixes, at most 4 words) have no source. The Gemini skill-name validator line is unsupported
  Basis: measured, fake-API run, 2.1.318; re-measured on claude 2.1.327, 2026-11-18 (fake-API probe, project skills `sk-a` to `sk-d`): four skills with 80-character descriptions add 339 bytes to the first request (messages 10,133 to 10,472 bytes), about 85 bytes or 20 to 25 tokens each, and no skill body text appears in the request. So discovery costs far less than 100 tokens per skill for short descriptions and grows with description length. Frontmatter with `license`, `compatibility`, `metadata` and `allowed-tools` loaded without error. The body size advice (1,500 to 5,000 characters, under 500 lines) is reported from agentskills.io and is not enforced by the program.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/specific-researches-found-through-gemini-ai-studio.jsonl:45; openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:958; openspec/changes/archive/2026-11-09-release-2-1-319/specific-researches-found-through-gemini-ai-studio.jsonl:101.
  Verified: source already on 2.1.327.
  Verified: not re-run 2026-11-19: advice plus 2.1.318 validator probes; nothing re-run, no literal check

- [x] **CTX-712** The Agent Skills standard (agentskills.io) was donated to the Linux Foundation AAIF. Frontmatter fields: `name`, `description`, `license`, `compatibility`, `metadata`, `allowed-tools`. 70+ platforms support it. Public registries hold over 1.3M skills with low-signal slop, and untrusted skills carry prompt-injection and script-execution supply-chain risk
  Basis: reported, agentskills.io. Checked on claude 2.1.327, 2026-11-18: the program loads a skill with the frontmatter fields `name`, `description`, `license`, `compatibility`, `metadata` and `allowed-tools` without error (fake-API probe, `skills` list in the init event). The Linux Foundation donation, the 70+ platform count, the 1.3M registry count and the supply-chain risk are facts about other parties and stay reported, unverified: they are not visible in the program.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/specific-researches-found-through-gemini-ai-studio.jsonl:68.
  Verified: source already on 2.1.327.
  Verified: not re-run 2026-11-19: third-party ecosystem claims (LF AAIF, 70+ platforms, 1.3M skills); nothing local to run

## Skills CTX-714

- [x] **CTX-714** `skillListingMaxDescChars` defaults to 1536 (binary). It cuts "description - when_to_use" and appends an ellipsis with no stderr warning. It is not a 200 clamp; setting 200 works (fake-API run)
  Basis: measured.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:876; openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:878.
  Verified: binary string search, claude 2.1.327, 2026-11-19: skillListingMaxDescChars default 1536 is present.
  Verified: re-run on claude 2.1.327, 2026-11-19: 2.1.327 binary: skillListingMaxDescChars described "Per-skill description character cap in the skill listing sent to Claude (default: 1536)"; the 200 run and the no-warning ellipsis not re-run
