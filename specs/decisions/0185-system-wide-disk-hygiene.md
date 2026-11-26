---
status: accepted
date: 2026-11-18
---
# System-Wide Disk Hygiene

## Context and Problem Statement

The user's 512 GB Mac reached about 90% use on 2026-11-18 (CTX-831), up from 68% six days earlier. The space taken by Claude Code itself is small (CTX-833: `~/.claude` 899 MB, installed versions 1.6 GB). The growth sits in what agent work leaves across the system: agent worktrees and build output inside projects, test temp folders under `$TMPDIR`, toolchain caches, and container engine data. `du` overstates APFS clones (CTX-832: 79 GB of Chrome code-sign clones cost about one 1.4 GB copy), so a size taken from `du` points at the wrong target. How far does claudetto's hygiene reach, and how does it decide what to remove?

## Considered Options

- Limit hygiene to claudetto and `~/.claude` state.
- Report across the system and remove only what the user confirms.
- Collect garbage across the system automatically, often, and only for items not in use.

## Decision Outcome

Chosen: an automatic garbage collector across the system. The user rejected the confirm-first option: hygiene that waits for a yes leaves the disk full, and claudetto exists to do this work for the user. The guard against data loss is the in-use test, not a question.

- Schedule: one collection at session start, at most once per 24 hours, plus one whenever the data volume falls below 15% free. The run is a background process; it never blocks a turn and never raises a hook error.
- In-use test, per kind. An item that fails any check is skipped, not queued:
  - Files and folders: no open handle (`lsof +D` run by the hook process, which is not inside the Bash sandbox; a sandboxed `lsof` sees only its own children), no live Claude Code session with its cwd inside, and no change within the kind's age limit.
  - Agent worktrees (`.claude/worktrees`): unlocked, `git status` clean, every commit reachable from a remote branch (GUARDS-027), and no live session inside.
  - Container engines, through their own CLI: `docker image prune -a`, `docker builder prune -a` and `docker volume prune -a`. These touch only images and volumes that no container references, in any state. A named volume is removed only after claudetto has seen it unattached for 7 days, because Docker records no last-use time; claudetto keeps that record itself. Containers are never removed. The socket of OrbStack and Docker Desktop is outside the Bash sandbox, so the collector runs in the hook process.
  - Claude Code versions: every version other than the running one and the one before it.
- Scope: the kinds above, plus project build output (`.build`, `target`, `node_modules` of projects untouched for 30 days), `$TMPDIR` folders left by test and probe runs (`TemporaryDirectory.*`, `claude-run`, `ccdocs-cli-test`, `surface`, `bedrock-test`, `mutant`), toolchain caches (Gradle, rustup toolchains, Bun, Konan, Xcode `iOS DeviceSupport`), and stale code-sign clones.
- Size: each candidate is measured by its APFS private size (`getattrlist` `ATTR_CMNEXT_PRIVATESIZE`), not by `du`.
- Record: each run appends path, kind, private bytes, age, and the command it ran to a log under the claudetto state folder. `/claudetto hygiene` shows the last run and offers a dry run.
- Out of reach: `~/.Trash` and the TCC-protected containers (CTX-834), which are reported as user-held.

Measured run, 2026-11-18, by the user's instruction: the three prune commands freed 39.5 GB (images 4.3 GB, build cache 11.9 GB, volumes 23.3 GB). The data volume went from 51.6 GB free to 85 GB free, and the running containers kept running.

## Consequences

- Removing a cache costs a re-download or a rebuild; the log names which.
- A removed Docker volume is unrecoverable. This is the strongest risk of the decision: a database volume of a compose project that has been idle for 7 days goes away. The 7-day unattached rule and the containers-are-kept rule bound it; a project that needs a volume to outlive that keeps a stopped container that references it.
- A system-wide run reads paths outside the project; it reads sizes and handles only, never file contents.
- GUARDS-072 governs commands the agent runs. The collector is a claudetto process acting on the user's standing instruction, so it is not an agent command.

Source: user decision, 2026-11-18 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/2cf55002-c3a4-457f-b01c-e854d76d621e.jsonl:671 and :3505); arc42/03_context_and_scope/machine.md CTX-831 to CTX-834; CTX-544; Docker prune run, 2026-11-18 (`docker image prune -a -f`, `docker builder prune -a -f`, `docker volume prune -a -f`, `df -h /System/Volumes/Data`).
